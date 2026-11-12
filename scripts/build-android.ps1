param(
    [string]$JdkPath = $env:JAVA_HOME,
    [string]$SdkPath = $(if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }),
    [string]$Keystore = $(Join-Path $env:LOCALAPPDATA 'Cinepolis/AndroidSigning/cinepolis-pro.p12'),
    [switch]$SignOnly
)

$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$buildTools = Join-Path $SdkPath 'build-tools/36.0.0'
$apksigner = Join-Path $buildTools 'apksigner.bat'
$zipalign = Join-Path $buildTools 'zipalign.exe'
$passwordFile = Join-Path (Split-Path -Parent $Keystore) 'signing-password.clixml'
if (!$JdkPath -or !(Test-Path -LiteralPath (Join-Path $JdkPath 'bin/java.exe'))) { throw 'Indica la ruta a JDK 21 con -JdkPath.' }
if (!(Test-Path -LiteralPath $apksigner) -or !(Test-Path -LiteralPath $zipalign)) { throw 'Instala Android SDK Build-Tools 36.0.0.' }
if (!(Test-Path -LiteralPath $Keystore)) { throw 'Indica el almacén de firma original con -Keystore.' }

$env:JAVA_HOME = $JdkPath
$env:ANDROID_HOME = $SdkPath
$clearPassword = !$env:CINEPOLIS_ANDROID_SIGNING_PASSWORD
if ($clearPassword) {
    if (!(Test-Path -LiteralPath $passwordFile)) { throw 'Falta la contraseña del almacén de firma.' }
    $env:CINEPOLIS_ANDROID_SIGNING_PASSWORD = [Net.NetworkCredential]::new('', (Import-Clixml -LiteralPath $passwordFile)).Password
}

Push-Location $project
try {
    if (!$SignOnly) {
        npm run android:sync
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo sincronizar Android.' }
        & ./android/gradlew.bat -p android :app:assembleRelease
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el APK.' }
    }
    $unsigned = Join-Path $project 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
    $output = Join-Path $project 'dist-android'
    New-Item -ItemType Directory -Force -Path $output | Out-Null
    $version = (Get-Content -Raw -LiteralPath (Join-Path $project 'package.json') | ConvertFrom-Json).version
    $aligned = Join-Path $output 'cinepolis-aligned.tmp'
    $apk = Join-Path $output "Cinepolis-PRO-$version.apk"
    & $zipalign -f -P 16 4 $unsigned $aligned
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo alinear el APK.' }
    & $apksigner sign --ks $Keystore --ks-key-alias cinepolis-pro --ks-pass env:CINEPOLIS_ANDROID_SIGNING_PASSWORD --out $apk $aligned
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo firmar el APK.' }
    & $apksigner verify --print-certs $apk
    if ($LASTEXITCODE -ne 0) { throw 'La firma del APK no es válida.' }
    Write-Output $apk
} finally {
    if ($aligned -and (Test-Path -LiteralPath $aligned -PathType Leaf)) { Remove-Item -LiteralPath $aligned }
    if ($clearPassword) { Remove-Item Env:CINEPOLIS_ANDROID_SIGNING_PASSWORD -ErrorAction SilentlyContinue }
    Pop-Location
}
