package com.gardeniaegypt.smartcarlauncher;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CarRadioPlugin.class);
        registerPlugin(LocalMusicPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
