# Android WebView Camera Setup Guide

## Problem
The QR scanner modal opens in Android WebView but doesn't activate the camera, even though it works fine in regular browsers.

## Solution

### 1. Android Manifest Permissions

Add these permissions to your `AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourpackage.name">

    <!-- Camera permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    
    <!-- Internet permission (if not already added) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application>
        <!-- Your app configuration -->
    </application>
</manifest>
```

### 2. WebView Configuration

In your Android Activity (Java/Kotlin), configure the WebView properly:

#### Java Example:
```java
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);

        // Enable JavaScript
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        
        // Enable camera and microphone access
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // Set WebChromeClient to handle permission requests
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Check if camera permission is granted
                if (ContextCompat.checkSelfPermission(MainActivity.this, 
                        Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    // Request camera permission
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{Manifest.permission.CAMERA},
                            CAMERA_PERMISSION_REQUEST_CODE);
                } else {
                    // Permission already granted, grant the web request
                    request.grant(request.getResources());
                }
            }
        });

        // Load your staff dashboard
        webView.loadUrl("https://yourdomain.com/staff-dashboard.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted - reload the page to retry camera access
                webView.reload();
            }
        }
    }
}
```

#### Kotlin Example:
```kotlin
import android.webkit.WebView
import android.webkit.WebSettings
import android.webkit.WebChromeClient
import android.webkit.PermissionRequest
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    companion object {
        private const val CAMERA_PERMISSION_REQUEST_CODE = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

        // Enable JavaScript
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
        }

        // Set WebChromeClient to handle permission requests
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                // Check if camera permission is granted
                if (ContextCompat.checkSelfPermission(
                        this@MainActivity, 
                        Manifest.permission.CAMERA
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    // Request camera permission
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.CAMERA),
                        CAMERA_PERMISSION_REQUEST_CODE
                    )
                } else {
                    // Permission already granted, grant the web request
                    request.grant(request.resources)
                }
            }
        }

        // Load your staff dashboard
        webView.loadUrl("https://yourdomain.com/staff-dashboard.html")
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted - reload the page to retry camera access
                webView.reload()
            }
        }
    }
}
```

### 3. Runtime Permission Handling (Android 6.0+)

For Android 6.0 (API 23) and above, you need to request runtime permissions:

```java
// Check and request camera permission on app start
private void checkCameraPermission() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.CAMERA},
                CAMERA_PERMISSION_REQUEST_CODE);
    }
}
```

### 4. HTTPS Requirement

**IMPORTANT**: Camera access via `getUserMedia()` requires HTTPS (secure connection) on Android WebView. Make sure:

- Your website is served over HTTPS
- OR for local testing, use `localhost` (which is exempt from HTTPS requirement)
- OR enable cleartext traffic for your domain (not recommended for production)

To enable cleartext for testing, add to `AndroidManifest.xml`:

```xml
<application
    android:usesCleartextTraffic="true"
    ...>
```

### 5. Testing Checklist

✅ **Android Manifest**: Camera permissions added  
✅ **WebView Settings**: JavaScript enabled, DOM storage enabled  
✅ **WebChromeClient**: Permission request handler implemented  
✅ **Runtime Permissions**: Camera permission requested and granted  
✅ **HTTPS**: Website served over HTTPS or localhost  
✅ **Device Camera**: Physical camera is working  

### 6. Debugging Tips

#### Check Console Logs
Enable WebView console logging in your Android app:

```java
WebView.setWebContentsDebuggingEnabled(true);
```

Then use Chrome DevTools:
1. Open `chrome://inspect` in Chrome browser on your computer
2. Connect your Android device via USB
3. Enable USB debugging on Android
4. Find your WebView in the list and click "inspect"
5. Check Console for errors

#### Common Errors

**"NotAllowedError"**: Permission denied
- Solution: Grant camera permission in Android app

**"NotFoundError"**: No camera found
- Solution: Check if device has a working camera

**"NotReadableError"**: Camera already in use
- Solution: Close other apps using camera

**"NotSupportedError"**: API not supported
- Solution: Ensure HTTPS or localhost, check WebView version

### 7. WebView Version

Ensure your app targets a recent WebView version that supports `getUserMedia()`:
- Minimum: Android 5.0 (API 21) with updated WebView
- Recommended: Android 7.0 (API 24) or higher

### 8. Alternative: Use Native Camera Intent

If WebView camera access doesn't work, you can implement a hybrid approach:

```java
// In WebView JavaScript, call Android native code
window.Android.scanQRCode();

// In Android, implement QR scanning with native camera
@JavascriptInterface
public void scanQRCode() {
    // Launch native QR scanner activity
    // Return result back to WebView
}
```

## Frontend Changes Made

The `staff-dashboard.html` has been updated with:
- ✅ Multiple constraint fallbacks for better compatibility
- ✅ Better error handling for Android WebView
- ✅ Automatic retry with basic constraints
- ✅ Video attributes (`playsinline`, `autoplay`, `muted`) for mobile compatibility
- ✅ Detailed console logging for debugging

## Support

If camera still doesn't work after these changes:
1. Check Chrome DevTools console for specific errors
2. Verify Android permissions are granted in device settings
3. Test on different Android versions/devices
4. Consider implementing native QR scanner as fallback
