@echo on  
@echo off
setlocal enabledelayedexpansion

:: =====================================================================
:: HyperNews Backend Application Launcher
:: =====================================================================

title HyperNews Backend Server

echo.
echo =====================================================================
echo                     HYPERNEWS BACKEND SERVER                         
echo =====================================================================
echo.

:: Step 1: Check Python installation
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    echo and ensure "Add Python to PATH" is checked during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VER=%%i
echo [INFO] Detected %PYTHON_VER%

:: Step 2: Manage Virtual Environment (.venv)
if not exist ".venv\Scripts\activate.bat" (
    echo [INFO] Virtual environment (.venv) not found.
    echo [INFO] Initializing new virtual environment in .venv...
    python -m venv .venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
    echo.

    echo [INFO] Activating virtual environment...
    call .venv\Scripts\activate.bat

    echo [INFO] Upgrading pip...
    python -m pip install --upgrade pip --quiet

    if exist "requirements.txt" (
        echo [INFO] Installing dependencies from requirements.txt...
        echo [INFO] This may take a few minutes on the first run...
        pip install -r requirements.txt
        if %ERRORLEVEL% neq 0 (
            echo [WARNING] Some dependencies may have encountered errors during installation.
        ) else (
            echo [OK] All dependencies installed successfully.
        )
    ) else (
        echo [WARNING] requirements.txt not found. Skipping dependency installation.
    )
    echo.
) else (
    echo [INFO] Activating existing virtual environment (.venv)...
    call .venv\Scripts\activate.bat
)

:: Step 3: Check Environment Configuration (.env)
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

:: Step 4: Display Server Details and Start Application
echo =====================================================================
echo  Server Status: Starting FastAPI Application
echo  Local URL:     http://127.0.0.1:8000
echo  API Docs:      http://127.0.0.1:8000/docs
echo  ReDoc:         http://127.0.0.1:8000/redoc
echo =====================================================================
echo.
echo Press Ctrl+C to shut down the server.
echo.

python main.py %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server stopped with exit code %ERRORLEVEL%.
    pause
)

deactivate
