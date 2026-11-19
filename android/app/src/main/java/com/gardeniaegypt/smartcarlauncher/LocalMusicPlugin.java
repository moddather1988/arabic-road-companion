package com.gardeniaegypt.smartcarlauncher;

import android.Manifest;
import android.content.ContentUris;
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

@CapacitorPlugin(
    name = "LocalMusic",
    permissions = {
        @Permission(alias = "legacyAudio", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "modernAudio", strings = { Manifest.permission.READ_MEDIA_AUDIO })
    }
)
public class LocalMusicPlugin extends Plugin {

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
        Uri collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

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

        try (Cursor cursor = getContext().getContentResolver().query(
            collection,
            columns,
            MediaStore.Audio.Media.IS_MUSIC + " != 0",
            null,
            MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC"
        )) {
            if (cursor == null) {
                call.reject("تعذر قراءة مكتبة الموسيقى");
                return;
            }

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

                String displayName = cursor.getString(nameCol);
                String extension = ".audio";

                if (displayName != null && displayName.lastIndexOf('.') >= 0) {
                    extension = displayName.substring(displayName.lastIndexOf('.'))
                        .replaceAll("[^A-Za-z0-9.]", "");
                }

                File output = new File(cache, id + "-" + modified + extension);
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
                item.put("id", String.valueOf(id));
                item.put("title", cursor.getString(titleCol));
                item.put("artist", cursor.getString(artistCol));
                item.put("album", cursor.getString(albumCol));
                item.put("duration", cursor.getLong(durationCol));
                item.put("path", output.getAbsolutePath());
                tracks.put(item);
            }

            JSObject result = new JSObject();
            result.put("tracks", tracks);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("حدث خطأ أثناء فحص ملفات الموسيقى", error);
        }
    }
}
