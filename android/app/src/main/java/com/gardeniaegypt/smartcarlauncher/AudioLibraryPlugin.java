package com.gardeniaegypt.smartcarlauncher;

import android.Manifest;
import android.content.ComponentName;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@CapacitorPlugin(
    name = "AudioLibrary",
    permissions = {
        @Permission(
            alias = "audio",
            strings = {
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE
            }
        )
    }
)
public class AudioLibraryPlugin extends Plugin {

    private ListenableFuture<MediaController> controllerFuture;
    private MediaController controller;

    @Override
    public void load() {
        SessionToken token = new SessionToken(
            getContext(),
            new ComponentName(getContext(), PlaybackService.class)
        );

        controllerFuture = new MediaController.Builder(getContext(), token).buildAsync();

        controllerFuture.addListener(() -> {
            try {
                controller = controllerFuture.get();
            } catch (ExecutionException | InterruptedException e) {
                android.util.Log.e("AudioLibrary", "Media controller connection failed", e);
            }
        }, ContextCompat.getMainExecutor(getContext()));
    }

    private MediaController getController(PluginCall call) {
        if (controller == null) {
            call.reject("مشغل الصوت لسه بيجهز. حاول مرة تانية بعد لحظة.");
            return null;
        }
        return controller;
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            requestPermissionForAlias("audio", call, "audioPermissionCallback");
            return;
        }
        scanGranted(call);
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        if (getPermissionState("audio") == PermissionState.GRANTED) {
            scanGranted(call);
        } else {
            call.reject("لازم تسمح للتطبيق بالوصول إلى ملفات الصوت لعرض مكتبتك.");
        }
    }

    private void scanGranted(PluginCall call) {
        JSArray result = new JSArray();

        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DURATION
        };

        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
        String sortOrder = MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC";

        try (Cursor cursor = getContext().getContentResolver().query(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            null,
            sortOrder
        )) {
            if (cursor != null) {
                int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                int albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID);
                int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idCol);
                    Uri contentUri = Uri.withAppendedPath(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        String.valueOf(id)
                    );

                    JSObject track = new JSObject();
                    track.put("id", String.valueOf(id));
                    track.put("uri", contentUri.toString());
                    track.put("title", cursor.getString(titleCol));
                    track.put("artist", cursor.getString(artistCol));
                    track.put("album", cursor.getString(albumCol));
                    track.put("albumId", String.valueOf(cursor.getLong(albumIdCol)));
                    track.put("duration", cursor.getLong(durationCol));
                    result.put(track);
                }
            }

            JSObject response = new JSObject();
            response.put("tracks", result);
            call.resolve(response);

        } catch (Exception e) {
            call.reject("تعذر قراءة مكتبة الموسيقى: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void setQueue(PluginCall call) {
        MediaController player = getController(call);
        if (player == null) return;

        JSArray tracks = call.getArray("tracks");
        int startIndex = call.getInt("index", 0);

        if (tracks == null || tracks.length() == 0) {
            call.reject("قائمة التشغيل فارغة.");
            return;
        }

        try {
            List<MediaItem> items = new ArrayList<>();

            for (int i = 0; i < tracks.length(); i++) {
                JSONObject track = tracks.getJSONObject(i);

                MediaMetadata metadata = new MediaMetadata.Builder()
                    .setTitle(track.optString("title", "Unknown"))
                    .setArtist(track.optString("artist", "Unknown"))
                    .setAlbumTitle(track.optString("album", ""))
                    .build();

                items.add(new MediaItem.Builder()
                    .setUri(track.getString("uri"))
                    .setMediaMetadata(metadata)
                    .build());
            }

            int safeIndex = Math.max(0, Math.min(startIndex, items.size() - 1));
            player.setMediaItems(items, safeIndex, 0);
            player.prepare();
            player.play();
            call.resolve();

        } catch (Exception e) {
            call.reject("تعذر بدء قائمة التشغيل: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;
        p.play();
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;
        p.pause();
        call.resolve();
    }

    @PluginMethod
    public void next(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;
        p.seekToNextMediaItem();
        p.play();
        call.resolve();
    }

    @PluginMethod
    public void previous(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;
        p.seekToPreviousMediaItem();
        p.play();
        call.resolve();
    }

    @PluginMethod
    public void seek(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;
        p.seekTo(call.getLong("position", 0L));
        call.resolve();
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;
        double volume = call.getDouble("volume", 1.0);
        p.setVolume((float) Math.max(0, Math.min(1, volume)));
        call.resolve();
    }

    @PluginMethod
    public void state(PluginCall call) {
        MediaController p = getController(call);
        if (p == null) return;

        JSObject result = new JSObject();
        result.put("playing", p.isPlaying());
        result.put("position", p.getCurrentPosition());
        result.put("duration", p.getDuration());
        result.put("index", p.getCurrentMediaItemIndex());
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        if (controllerFuture != null) {
            MediaController.releaseFuture(controllerFuture);
            controllerFuture = null;
            controller = null;
        }
        super.handleOnDestroy();
    }
}
