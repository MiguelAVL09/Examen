package mx.cinepolis.capacitacion;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeActionsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
