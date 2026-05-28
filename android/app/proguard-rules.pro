# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep metadata used by reflection/kotlin serialization paths in Expo/RN modules.
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*
-keep class kotlin.Metadata { *; }

# Expo modules are discovered/bridged dynamically in release builds.
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# React Native bridge/JSI classes that should not be stripped.
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# Required by react-native-screens native/Fabric integration in release builds.
# Prevent obfuscation/removal of FabricUIManager internals (e.g. mBinding).
-keep class com.facebook.react.fabric.FabricUIManager { *; }
-keepclassmembers class com.facebook.react.fabric.FabricUIManager { *; }
-keep class com.swmansion.rnscreens.** { *; }

# Sentry runtime.
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# In-app purchase native modules.
-keep class com.dooboolab.rniap.** { *; }

# Common warnings that are safe to ignore in release shrinking.
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlin.**
