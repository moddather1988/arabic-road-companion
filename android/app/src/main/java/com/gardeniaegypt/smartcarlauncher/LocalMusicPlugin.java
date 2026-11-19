package com.gardeniaegypt.smartcarlauncher;

import com.getcapacitor.annotation.ActivityCallback;

import androidx.activity.result.ActivityResult;

import android.provider.OpenableColumns;

import android.media.MediaMetadataRetriever;

import android.app.Activity;

import android.Manifest;
import android.content.ContentUris;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "LocalMusic",
    permissions = {
        @Permission(alias = "legacyAudio", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "modernAudio", strings = { Manifest.permission.READ_MEDIA_AUDIO })
    }
)

public class LocalMusicPlugin extends Plugin {

    private BroadcastReceiver storageReceiver;

    @Override
    public void load() {
        storageReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();

                if (Intent.ACTION_MEDIA_MOUNTED.equals(action)
                    || Intent.ACTION_MEDIA_UNMOUNTED.equals(action)
                    || Intent.ACTION_MEDIA_EJECT.equals(action)
                    || Intent.ACTION_MEDIA_REMOVED.equals(action)
                    || Intent.ACTION_MEDIA_BAD_REMOVAL.equals(action)
                    || Intent.ACTION_MEDIA_SCANNER_FINISHED.equals(action)) {

                    JSObject event = new JSObject();
                    event.put("action", action == null ? "unknown" : action);
                    notifyListeners("storageChanged", event);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_MEDIA_MOUNTED);
        filter.addAction(Intent.ACTION_MEDIA_UNMOUNTED);
        filter.addAction(Intent.ACTION_MEDIA_EJECT);
        filter.addAction(Intent.ACTION_MEDIA_REMOVED);
        filter.addAction(Intent.ACTION_MEDIA_BAD_REMOVAL);
        filter.addAction(Intent.ACTION_MEDIA_SCANNER_FINISHED);
        filter.addDataScheme("file");

        if (Build.VERSION.SDK_INT >= 33) {
            getContext().registerReceiver(
                storageReceiver,
                filter,
                Context.RECEIVER_EXPORTED
            );
        } else {
            getContext().registerReceiver(storageReceiver, filter);
        }
    }

    @Override
    public void handleOnDestroy() {
        if (storageReceiver != null) {
            try {
                getContext().unregisterReceiver(storageReceiver);
            } catch (IllegalArgumentException ignored) {
                // Receiver was already unregistered.
            }
            storageReceiver = null;
        }
    }


    @PluginMethod
    public void pickFiles(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("audio/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            startActivityForResult(call, intent, "filesPicked");
        } catch (Exception error) {
            call.reject("تعذر فتح مدير ملفات Android", error);
        }
    }

    @ActivityCallback
    public void filesPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.resolve(new JSObject());
            return;
        }

        Intent data = result.getData();
        android.content.ClipData clip = data.getClipData();
        java.util.ArrayList<Uri> selected = new java.util.ArrayList<>();

        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri uri = clip.getItemAt(i).getUri();
                if (uri != null) selected.add(uri);
            }
        } else if (data.getData() != null) {
            selected.add(data.getData());
        }

        JSArray files = new JSArray();
        File directory = new File(getContext().getFilesDir(), "imported-music");
        if (!directory.exists() && !directory.mkdirs()) {
            call.reject("تعذر إنشاء مجلد ملفات الموسيقى");
            return;
        }

        int index = 0;
        for (Uri uri : selected) {
            String displayName = "audio-" + (++index);
            long reportedSize = 0;

            try (Cursor cursor = getContext().getContentResolver().query(
                uri,
                new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE },
                null, null, null
            )) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                    if (nameIndex >= 0 && !cursor.isNull(nameIndex)) {
                        displayName = cursor.getString(nameIndex);
                    }
                    if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
                        reportedSize = cursor.getLong(sizeIndex);
                    }
                }
            } catch (Exception ignored) {}

            String safeName = displayName.replaceAll("[^A-Za-z0-9._-]", "_");
            if (safeName.isEmpty()) safeName = "audio-" + index;
            File output = new File(
                directory,
                System.currentTimeMillis() + "-" + index + "-" + safeName
            );

            try (
                InputStream input = getContext().getContentResolver().openInputStream(uri);
                FileOutputStream stream = new FileOutputStream(output)
            ) {
                if (input == null) {
                    output.delete();
                    continue;
                }

                byte[] buffer = new byte[32768];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    stream.write(buffer, 0, count);
                }
            } catch (Exception copyError) {
                output.delete();
                continue;
            }

            JSObject item = new JSObject();
            item.put("name", displayName);
            item.put("path", output.getAbsolutePath());
            item.put("size", reportedSize > 0 ? reportedSize : output.length());

            try {
                MediaMetadataRetriever retriever = new MediaMetadataRetriever();
                try {
                    retriever.setDataSource(getContext(), Uri.fromFile(output));
                    String duration = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_DURATION
                    );
                    String title = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_TITLE
                    );
                    String artist = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_ARTIST
                    );
                    String album = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_ALBUM
                    );

                    item.put("duration", duration == null ? 0 : Long.parseLong(duration));
                    item.put("title", title == null ? "" : title);
                    item.put("artist", artist == null ? "" : artist);
                    item.put("album", album == null ? "" : album);
                } finally {
                    retriever.release();
                }
            } catch (Exception ignored) {
                item.put("duration", 0);
            }

            files.put(item);
        }

        JSObject response = new JSObject();
        response.put("files", files);
        call.resolve(response);
    }

    @PluginMethod
    public void scan(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= 33 ? "modernAudio" : "legacyAudio";

        if (!hasPermission(alias)) {
            requestPermissionForAlias(alias, call, "permissionResult");
            return;
        }

        scanGranted(call);
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= 33 ? "modernAudio" : "legacyAudio";

        if (!hasPermission(alias)) {
            call.reject("يلزم السماح للتطبيق بالوصول إلى ملفات الموسيقى");
            return;
        }

        scanGranted(call);
    }

    private void scanGranted(PluginCall call) {
        JSArray tracks = new JSArray();
        String[] columns = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DATE_MODIFIED
        };

        File cache = new File(getContext().getCacheDir(), "device-music");
        if (!cache.exists()) cache.mkdirs();

        Set<String> seen = new HashSet<>();

        try {
            String[] volumes;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                volumes = MediaStore.getExternalVolumeNames(getContext())
                    .toArray(new String[0]);
            } else {
                volumes = new String[] { "external" };
            }

            for (String volume : volumes) {
                Uri collection;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    collection = MediaStore.Audio.Media.getContentUri(volume);
                } else {
                    collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                }

                try (Cursor cursor = getContext().getContentResolver().query(
                    collection,
                    columns,
                    null,
                    null,
                    MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC"
                )) {
                    if (cursor == null) continue;

                    int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                    int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                    int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                    int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                    int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                    int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
                    int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
                    int modifiedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idCol);
                        long size = cursor.getLong(sizeCol);
                        long modified = cursor.getLong(modifiedCol);

                        String uniqueId = volume + ":" + id;
                        if (!seen.add(uniqueId)) continue;

                        String displayName = cursor.getString(nameCol);
                        String extension = ".audio";

                        if (displayName != null && displayName.lastIndexOf('.') >= 0) {
                            extension = displayName.substring(displayName.lastIndexOf('.'))
                                .replaceAll("[^A-Za-z0-9.]", "");
                        }

                        String safeVolume = volume.replaceAll("[^A-Za-z0-9_-]", "_");
                        File output = new File(cache, safeVolume + "-" + id + "-" + modified + extension);

                        Uri contentUri = ContentUris.withAppendedId(collection, id);

                        if (!output.exists() || (size > 0 && output.length() != size)) {
                            try (
                                InputStream input = getContext().getContentResolver().openInputStream(contentUri);
                                FileOutputStream stream = new FileOutputStream(output)
                            ) {
                                if (input == null) continue;

                                byte[] buffer = new byte[32768];
                                int count;

                                while ((count = input.read(buffer)) != -1) {
                                    stream.write(buffer, 0, count);
                                }
                            } catch (Exception copyError) {
                                output.delete();
                                continue;
                            }
                        }

                        JSObject item = new JSObject();
                        item.put("id", uniqueId);
                        item.put("title", cursor.getString(titleCol));
                        item.put("artist", cursor.getString(artistCol));
                        item.put("album", cursor.getString(albumCol));
                        item.put("duration", cursor.getLong(durationCol));
                        item.put("path", output.getAbsolutePath());
                        tracks.put(item);
                    }
                }
            }

            JSObject result = new JSObject();
            result.put("tracks", tracks);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("حدث خطأ أثناء فحص ملفات الموسيقى", error);
        }
    }
}
