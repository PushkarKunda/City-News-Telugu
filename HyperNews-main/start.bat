@echo off
setlocal enabledelayedexpansion

:: =====================================================================
:: HyperNews Full-Stack Application Launcher (Backend + Admin Portal)
:: =====================================================================

title HyperNews Full-Stack Server

:: Set working directory to the directory where this script is located
cd /d "%~dp0"

:: Read PORT from .env if present, otherwise default to 8000
set "PORT=8000"
set "FRONTEND_PORT=5173"
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

:: Parse command line argument
set "CMD=%~1"
set "TARGET=%~2"
if "%CMD%"=="" set "CMD=run"

:: Direct shortcuts
if /i "%CMD%"=="backend" (
    set "CMD=run"
    set "TARGET=backend"
    goto :do_run
)
if /i "%CMD%"=="frontend" (
    set "CMD=run"
    set "TARGET=frontend"
    goto :do_run
)

if /i "%CMD%"=="install" goto :do_install
if /i "%CMD%"=="run"     goto :do_run
if /i "%CMD%"=="start"   goto :do_run
if /i "%CMD%"=="stop"    goto :do_stop
if /i "%CMD%"=="restart" goto :do_restart
if /i "%CMD%"=="status"  goto :do_status
if /i "%CMD%"=="help"    goto :do_help
if /i "%CMD%"=="/?"      goto :do_help
if /i "%CMD%"=="-h"      goto :do_help
if /i "%CMD%"=="--help"  goto :do_help

:: If first argument starts with '-' (options/flags), treat as run with options
if "%CMD:~0,1%"=="-" goto :do_run

echo [ERROR] Unknown command: %CMD%
goto :do_help


:: =====================================================================
:: Subroutine: CHECK PYTHON
:: =====================================================================
:check_python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    echo and ensure "Add Python to PATH" is checked during installation.
    echo.
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VER=%%i
echo [INFO] Detected %PYTHON_VER%
exit /b 0


:: =====================================================================
:: Subroutine: CHECK NODE & NPM
:: =====================================================================
:check_node
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Node.js is not installed or not found in system PATH.
    echo The Admin Portal requires Node.js v18 or higher to run.
    echo Download from https://nodejs.org/
    echo.
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v 2^>^&1') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v 2^>^&1') do set NPM_VER=%%i
echo [INFO] Detected Node %NODE_VER% - npm %NPM_VER%
exit /b 0


:: =====================================================================
:: Subroutine: CHECK ENV FILE
:: =====================================================================
:check_env
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env file not found. Creating default .env from .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Created .env file. Please configure your secrets and API keys if needed.
    ) else (
        echo [WARNING] Neither .env nor .env.example found. Default configuration will be used.
    )
    echo.
)
exit /b 0


:: =====================================================================
:: Command: HELP
:: =====================================================================
:do_help
echo.
echo =====================================================================
echo               HYPERNEWS FULL-STACK APPLICATION LAUNCHER              
echo =====================================================================
echo.
echo Usage: start.bat [command] [target]
echo.
echo Available Commands:
echo   run [target]      Start services [default]
echo                     - start.bat run           Start BOTH Backend and Admin Portal
echo                     - start.bat run backend   Start only FastAPI backend
echo                     - start.bat run frontend  Start only Admin Portal
echo.
echo   install           Install dependencies for both Backend (Python) and Frontend (NPM)
echo                     - start.bat install
echo                     - start.bat install backend
echo                     - start.bat install frontend
echo.
echo   stop [target]     Stop running services
echo                     - start.bat stop          Stop BOTH Backend and Admin Portal
echo                     - start.bat stop backend  Stop only FastAPI backend (port %PORT%)
echo                     - start.bat stop frontend Stop only Admin Portal (port %FRONTEND_PORT%)
echo.
echo   restart [target]  Stop and restart services
echo.
echo   status            Check health and ports for both Backend and Admin Portal
echo   help              Show this help message
echo.
exit /b 0


:: =====================================================================
:: Command: INSTALL
:: =====================================================================
:do_install
echo.
echo =====================================================================
echo               HYPERNEWS FULL-STACK - INSTALLATION                    
echo =====================================================================
echo.

if /i "%TARGET%"=="frontend" goto :install_frontend

:install_backend
echo --- [1/2] Installing Backend Dependencies ---
call :check_python
if %ERRORLEVEL% neq 0 exit /b 1

if not exist ".venv\Scripts\activate.bat" (
    echo [INFO] Virtual environment .venv not found.
    echo [INFO] Initializing new virtual environment in .venv...
    python -m venv .venv
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
    echo.
) else (
    echo [INFO] Found existing virtual environment in .venv.
)

echo [INFO] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [INFO] Upgrading pip...
python -m pip install --upgrade pip --quiet

if exist "requirements.txt" (
    echo [INFO] Installing dependencies from requirements.txt...
    echo [INFO] This may take a few minutes...
    pip install -r requirements.txt
    if !ERRORLEVEL! neq 0 (
        echo [WARNING] Some dependencies encountered errors during installation.
    ) else (
        echo [OK] Backend dependencies installed successfully.
    )
) else (
    echo [WARNING] requirements.txt not found. Skipping backend dependency installation.
)
echo.
call :check_env

if /i "%TARGET%"=="backend" goto :install_done

:install_frontend
echo --- [2/2] Installing Admin Portal Frontend Dependencies ---
call :check_node
if %ERRORLEVEL% equ 0 (
    if exist "admin-portal\package.json" (
        echo [INFO] Installing npm dependencies in admin-portal...
        pushd admin-portal
        call npm install
        if !ERRORLEVEL! equ 0 (
            echo [OK] Admin Portal dependencies installed successfully.
        ) else (
            echo [WARNING] npm install encountered errors.
        )
        popd
    ) else (
        echo [WARNING] admin-portal\package.json not found. Skipping frontend install.
    )
) else (
    echo [WARNING] Skipping frontend install because Node.js is not available.
)
echo.

:install_done
echo =====================================================================
echo [OK] Installation process completed.
echo You can now start the full stack with: start.bat run
echo =====================================================================
echo.
exit /b 0


:: =====================================================================
:: Command: RUN
:: =====================================================================
:do_run
echo.
echo =====================================================================
echo               HYPERNEWS FULL-STACK APPLICATION SERVER                
echo =====================================================================
echo.

if /i "%TARGET%"=="frontend" goto :run_frontend_only
if /i "%TARGET%"=="backend"  goto :run_backend_only

:: Default: Run both
call :check_python
if %ERRORLEVEL% neq 0 exit /b 1

call :check_node

:: Check if backend virtualenv exists
if not exist ".venv\Scripts\activate.bat" (
    echo [INFO] Backend virtual environment not found. Running install first...
    call :do_install
    if %ERRORLEVEL% neq 0 exit /b 1
)

:: Check if backend port is already running
set "RUNNING_BACKEND_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    set "RUNNING_BACKEND_PID=%%a"
)

:: Check if frontend port is already running
set "RUNNING_FRONTEND_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    set "RUNNING_FRONTEND_PID=%%a"
)

:: Start Frontend in a new window if not already running
if not "!RUNNING_FRONTEND_PID!"=="" (
    echo [INFO] Admin Portal is already running on port %FRONTEND_PORT% [PID !RUNNING_FRONTEND_PID!].
) else (
    if exist "admin-portal" (
        echo [INFO] Starting Admin Portal dev server in background...
        start "HyperNews Admin Portal" cmd /k "cd /d %~dp0admin-portal && npm run dev -- --port %FRONTEND_PORT%"
        echo [OK] Admin Portal launched: http://localhost:%FRONTEND_PORT%
    )
)

:: Start Backend in current window
if not "!RUNNING_BACKEND_PID!"=="" (
    echo [WARNING] Backend port %PORT% is already in use by PID !RUNNING_BACKEND_PID!.
    echo [INFO] Run "start.bat stop" to terminate it or "start.bat restart" to restart it.
    exit /b 1
)

echo.
echo =====================================================================
echo  HyperNews Stack Active:
echo   - FastAPI Backend:  http://127.0.0.1:%PORT%
echo   - Swagger API Docs: http://127.0.0.1:%PORT%/docs
echo   - Admin Portal UI:  http://localhost:%FRONTEND_PORT%
echo =====================================================================
echo.
echo [INFO] Starting FastAPI application in current console...
echo Press Ctrl+C to shut down the backend server.
echo.

call .venv\Scripts\activate.bat
python main.py
deactivate 2>nul
exit /b %ERRORLEVEL%


:run_frontend_only
call :check_node
if %ERRORLEVEL% neq 0 exit /b 1
echo [INFO] Starting Admin Portal frontend on port %FRONTEND_PORT%...
cd /d "%~dp0admin-portal"
npm run dev -- --port %FRONTEND_PORT%
exit /b %ERRORLEVEL%


:run_backend_only
call :check_python
if %ERRORLEVEL% neq 0 exit /b 1
if not exist ".venv\Scripts\activate.bat" (
    call :do_install
    if %ERRORLEVEL% neq 0 exit /b 1
)
call .venv\Scripts\activate.bat
echo [INFO] Starting FastAPI backend on port %PORT%...
python main.py
deactivate 2>nul
exit /b %ERRORLEVEL%


:: =====================================================================
:: Command: STOP
:: =====================================================================
:do_stop
echo.
echo =====================================================================
echo                 HYPERNEWS - STOPPING SERVICES                        
echo =====================================================================
echo.

if /i "%TARGET%"=="frontend" goto :stop_frontend
if /i "%TARGET%"=="backend"  goto :stop_backend

:stop_backend
echo [INFO] Checking Backend Port %PORT%...
set "STOPPED_COUNT=0"
if exist ".venv\Scripts\python.exe" (
    for /f "tokens=*" %%k in ('.venv\Scripts\python.exe -c "import psutil, sys; port = int(sys.argv[1]); killed = set(); [(killed.add(p.pid), p.kill()) for c in psutil.net_connections(\"tcp\") if c.laddr.port == port and c.status == psutil.CONN_LISTEN and c.pid for p in [psutil.Process(c.pid).parent(), psutil.Process(c.pid)] if p and \"python\" in p.name().lower()]; print(len(killed))" %PORT% 2^>nul') do (
        set "STOPPED_COUNT=%%k"
    )
)
if "!STOPPED_COUNT!"=="0" (
    set "LAST_PID="
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
        if not "%%a"=="!LAST_PID!" (
            set "LAST_PID=%%a"
            echo [INFO] Terminating process PID %%a listening on port %PORT%...
            taskkill /F /T /PID %%a >nul 2>&1
            if !ERRORLEVEL! equ 0 (
                set /a STOPPED_COUNT+=1
                echo [OK] Successfully terminated PID %%a.
            )
        )
    )
)
if "!STOPPED_COUNT!"=="0" (
    echo [INFO] No active backend server found on port %PORT%.
) else (
    echo [OK] Backend server on port %PORT% has been stopped.
)

if /i "%TARGET%"=="backend" goto :stop_done

:stop_frontend
echo.
echo [INFO] Checking Admin Portal Frontend Port %FRONTEND_PORT%...
set "STOPPED_FE=0"
set "LAST_FE_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="!LAST_FE_PID!" (
        set "LAST_FE_PID=%%a"
        echo [INFO] Terminating Frontend process PID %%a listening on port %FRONTEND_PORT%...
        taskkill /F /T /PID %%a >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set /a STOPPED_FE+=1
            echo [OK] Successfully terminated Frontend PID %%a.
        )
    )
)
if "!STOPPED_FE!"=="0" (
    echo [INFO] No active frontend server found on port %FRONTEND_PORT%.
) else (
    echo [OK] Admin Portal on port %FRONTEND_PORT% has been stopped.
)

:stop_done
echo.
exit /b 0


:: =====================================================================
:: Command: RESTART
:: =====================================================================
:do_restart
echo.
echo =====================================================================
echo                HYPERNEWS - RESTARTING SERVICES                       
echo =====================================================================
echo.

call :do_stop
echo [INFO] Waiting 2 seconds before starting...
timeout /t 2 /nobreak >nul
goto :do_run


:: =====================================================================
:: Command: STATUS
:: =====================================================================
:do_status
echo.
echo =====================================================================
echo                 HYPERNEWS - FULL-STACK STATUS                        
echo =====================================================================
echo.

set "STATUS_BACKEND_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    set "STATUS_BACKEND_PID=%%a"
)

set "STATUS_FRONTEND_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    set "STATUS_FRONTEND_PID=%%a"
)

if not "%STATUS_BACKEND_PID%"=="" (
    echo [BACKEND]  FastAPI is RUNNING
    echo   - Port:      %PORT%
    echo   - PID:       %STATUS_BACKEND_PID%
    echo   - Local URL: http://127.0.0.1:%PORT%
    echo   - API Docs:  http://127.0.0.1:%PORT%/docs
) else (
    echo [BACKEND]  FastAPI is NOT running - Port %PORT% is idle.
)

echo.

if not "%STATUS_FRONTEND_PID%"=="" (
    echo [FRONTEND] Admin Portal is RUNNING
    echo   - Port:      %FRONTEND_PORT%
    echo   - PID:       %STATUS_FRONTEND_PID%
    echo   - Local URL: http://localhost:%FRONTEND_PORT%
) else (
    echo [FRONTEND] Admin Portal is NOT running - Port %FRONTEND_PORT% is idle.
)

echo.
exit /b 0
