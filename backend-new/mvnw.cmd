@echo off
setlocal

for %%i in ("%~dp0.") do set "MAVEN_PROJECTBASEDIR=%%~fi"
set "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"

if not exist "%WRAPPER_JAR%" (
    echo VaultUnit Maven Wrapper is missing: "%WRAPPER_JAR%"
    exit /b 1
)

java -classpath "%WRAPPER_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" org.apache.maven.wrapper.MavenWrapperMain %*
exit /b %ERRORLEVEL%
