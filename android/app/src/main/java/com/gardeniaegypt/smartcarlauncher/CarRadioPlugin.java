package com.gardeniaegypt.smartcarlauncher;

import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.content.pm.PackageManager;
import java.util.List;
import java.util.Locale;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "CarRadio")
public class CarRadioPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();

        Intent query = new Intent(Intent.ACTION_MAIN);
        query.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> apps = pm.queryIntentActivities(query, 0);

        ResolveInfo best = null;
        int bestScore = 0;

        for (ResolveInfo app : apps) {
            String pkg = app.activityInfo.packageName;

            if (pkg.equals(getContext().getPackageName())) {
                continue;
            }

            String label = app.loadLabel(pm).toString().toLowerCase(Locale.ROOT);
            String key = (label + " " + pkg).toLowerCase(Locale.ROOT);

            int score = 0;

            if (key.contains("tuner")) score += 5;
            if (key.contains("radio")) score += 4;
            if (key.contains("fm")) score += 3;
            if (key.contains("راديو")) score += 5;
            if (key.contains("إذاعة")) score += 5;

            if (score > bestScore) {
                bestScore = score;
                best = app;
            }
        }

        JSObject result = new JSObject();

        if (best == null) {
            result.put("opened", false);
            result.put("message", "لم يتم العثور على تطبيق راديو FM الأصلي في الشاشة.");
            call.resolve(result);
            return;
        }

        try {
            Intent launch = new Intent();
            launch.setClassName(
                best.activityInfo.packageName,
                best.activityInfo.name
            );
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launch);

            result.put("opened", true);
            result.put("message", "تم فتح تطبيق راديو السيارة.");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("تعذر فتح تطبيق الراديو", e);
        }
    }
}
