package mx.cinepolis.capacitacion;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "NativeActions")
public class NativeActionsPlugin extends Plugin {
    @PluginMethod
    public void saveDocument(PluginCall call) {
        String name = call.getString("name", "");
        String mime = call.getString("mime", "");
        String data = call.getString("data");
        if (name.trim().isEmpty() || name.contains("/") || name.contains("\\") || mime.trim().isEmpty() || data == null) {
            call.reject("Documento inválido.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mime)
            .putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(call, intent, "documentSelected");
        } catch (ActivityNotFoundException error) {
            call.reject("No se encontró un gestor de archivos.");
        }
    }

    @ActivityCallback
    private void documentSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.resolve(new JSObject().put("saved", false));
            return;
        }
        bridge.execute(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IOException("Document provider returned no output stream");
                output.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
            } catch (IOException | IllegalArgumentException | SecurityException error) {
                call.reject("No se pudo guardar el archivo.");
                return;
            }
            call.resolve(new JSObject().put("saved", true));
        });
    }

    @PluginMethod
    public void openLink(PluginCall call) {
        Uri uri = Uri.parse(call.getString("url", ""));
        boolean email = "mailto".equals(uri.getScheme());
        if (!email && (!"https".equals(uri.getScheme()) || uri.getHost() == null)) {
            call.reject("Enlace inválido.");
            return;
        }
        try {
            getActivity().startActivity(new Intent(email ? Intent.ACTION_SENDTO : Intent.ACTION_VIEW, uri));
            call.resolve();
        } catch (ActivityNotFoundException error) {
            call.reject("No hay una aplicación para abrir el enlace.");
        }
    }
}
