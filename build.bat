@echo off
if /i "%~1"=="__run__" goto RUN
cmd /k ""%~f0" __run__"
exit /b

:RUN
chcp 936 >nul
setlocal
cd /d "%~dp0"

set "ROOT=%CD%"
set "DIST=%ROOT%\DIST"
set "BUILD_ENV_ROOT=%ROOT%\build_env"
set "DEFAULT_ENV=%BUILD_ENV_ROOT%\env"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "HELPER=%ROOT%\helper"
set "REQ=%BACKEND%\requirements.txt"
set "ZIP=%ROOT%\MAHO-runtime.zip"
set "EXITCODE=0"

echo ============================================================
echo 安全提醒：
echo 发布前请检查 config.yaml、环境变量和其它配置文件，确认没有泄露自己的 API Key、Token、账号密码。
echo 如果这个 DIST 会发给别人，请先清理个人密钥和私有服务地址。
echo ============================================================
echo.
echo 当前项目目录：
echo %ROOT%
echo.

if not exist "%DIST%" md "%DIST%"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

if not exist "%BACKEND%" goto NO_BACKEND
if not exist "%REQ%" goto NO_REQ

echo 正在检查 Conda...
where conda >nul 2>nul
if errorlevel 1 goto NO_CONDA

for /f "delims=" %%A in ('conda info --base 2^>nul') do set "CONDA_BASE=%%A"
if not defined CONDA_BASE goto NO_CONDA_BASE

set "CONDA_EXE=%CONDA_BASE%\Scripts\conda.exe"
if not exist "%CONDA_EXE%" goto NO_CONDA_EXE

echo.
echo 是否为打包新建一个 Conda 环境？
choice /c YN /n /m "Y=是，N=否："
if errorlevel 2 goto USE_EXISTING
goto CREATE_ENV

:CREATE_ENV
echo.
echo 请输入新环境路径。直接回车使用默认路径：
echo %DEFAULT_ENV%
set /p NEW_ENV=路径：
if not defined NEW_ENV set "NEW_ENV=%DEFAULT_ENV%"

if exist "%NEW_ENV%" goto ASK_REMOVE_ENV
goto MAKE_ENV_PARENT

:ASK_REMOVE_ENV
echo.
echo 环境路径已存在：
echo %NEW_ENV%
echo 是否删除后重新创建？
choice /c YN /n /m "Y=删除重建，N=取消："
if errorlevel 2 goto CANCEL
rd /s /q "%NEW_ENV%"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL
goto MAKE_ENV_PARENT

:MAKE_ENV_PARENT
if not exist "%BUILD_ENV_ROOT%" md "%BUILD_ENV_ROOT%"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

echo.
echo 正在创建环境：
echo %NEW_ENV%
call "%CONDA_EXE%" create -y -p "%NEW_ENV%" python=3.10
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

echo.
echo 正在升级 pip...
call "%NEW_ENV%\python.exe" -m pip install --upgrade pip
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

echo.
echo 正在安装后端依赖...
call "%NEW_ENV%\python.exe" -m pip install -r "%REQ%"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

set "PACK_ENV=%NEW_ENV%"
goto ASK_PACK_ENV

:USE_EXISTING
echo.
echo 是否打包 Conda 环境到 DIST？
choice /c YN /n /m "Y=打包，N=跳过："
if errorlevel 2 set "SKIP_PACK=1" & goto COPY_BACKEND
if defined CONDA_PREFIX goto USE_ACTIVE_ENV
echo 请输入要打包的 Conda 环境路径。
echo 直接回车将使用默认环境：
echo %DEFAULT_ENV%
set /p PACK_ENV=路径：
if not defined PACK_ENV set "PACK_ENV=%DEFAULT_ENV%"
goto CHECK_PACK_ENV

:USE_ACTIVE_ENV
echo 检测到当前激活的 Conda 环境：
echo %CONDA_PREFIX%
echo 是否使用这个环境进行打包？
choice /c YN /n /m "Y=使用，N=手动输入："
if errorlevel 2 goto INPUT_PACK_ENV
set "PACK_ENV=%CONDA_PREFIX%"
goto CHECK_PACK_ENV

:INPUT_PACK_ENV
echo 请输入要打包的 Conda 环境路径。
echo 直接回车将使用默认环境：
echo %DEFAULT_ENV%
set /p PACK_ENV=路径：
if not defined PACK_ENV set "PACK_ENV=%DEFAULT_ENV%"
goto CHECK_PACK_ENV

:CHECK_PACK_ENV
if not defined PACK_ENV goto NO_PACK_ENV
if not exist "%PACK_ENV%" goto PACK_ENV_MISSING
goto INSTALL_PACK

:ASK_PACK_ENV
echo.
echo 是否打包 Conda 环境到 DIST？
choice /c YN /n /m "Y=打包，N=跳过："
if errorlevel 2 set "SKIP_PACK=1" & goto COPY_BACKEND
goto INSTALL_PACK

:INSTALL_PACK
echo.
echo 正在安装 conda-pack...
call "%CONDA_EXE%" install -y -p "%PACK_ENV%" -c conda-forge conda-pack
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

echo.
echo 正在打包环境...
if exist "%ZIP%" del /q "%ZIP%"
if exist "%PACK_ENV%\Scripts\conda-pack.exe" goto PACK_WITH_EXE
goto PACK_WITH_CONDA

:PACK_WITH_EXE
call "%PACK_ENV%\Scripts\conda-pack.exe" -p "%PACK_ENV%" -o "%ZIP%"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL
goto COPY_BACKEND

:PACK_WITH_CONDA
call "%CONDA_EXE%" run -p "%PACK_ENV%" conda-pack -p "%PACK_ENV%" -o "%ZIP%"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL
goto COPY_BACKEND

:COPY_BACKEND
echo.
echo 是否复制后端源码到 DIST？
choice /c YN /n /m "Y=复制，N=跳过："
if errorlevel 2 goto ASK_BUILD_FRONTEND

echo.
echo 正在复制后端源码到 DIST...
if exist "%DIST%\backend" rd /s /q "%DIST%\backend"
robocopy "%BACKEND%" "%DIST%\backend" /MIR /XD "__pycache__" "runtime" ".git" ".vscode" /XF "*.pyc" "*.pyo" /NFL /NDL /NJH /NJS /NP
if errorlevel 8 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

set "PRIVATE_BACKEND_CONFIG=%DIST%\backend\data\config.yaml"
set "EXPECTED_PRIVATE_BACKEND_CONFIG=%ROOT%\DIST\backend\data\config.yaml"
if /i not "%PRIVATE_BACKEND_CONFIG%"=="%EXPECTED_PRIVATE_BACKEND_CONFIG%" goto PRIVATE_BACKEND_CONFIG_PATH_FAIL
if not exist "%PRIVATE_BACKEND_CONFIG%" goto PRIVATE_BACKEND_CONFIG_CLEANED

echo.
echo 正在删除 DIST 中的私有测试配置：
echo %PRIVATE_BACKEND_CONFIG%
del /f /q "%PRIVATE_BACKEND_CONFIG%"
if exist "%PRIVATE_BACKEND_CONFIG%" set "EXITCODE=1" & goto FAIL

goto PRIVATE_BACKEND_CONFIG_CLEANED

:PRIVATE_BACKEND_CONFIG_PATH_FAIL
echo 私有测试配置路径检查失败，已停止删除。
echo %PRIVATE_BACKEND_CONFIG%
set "EXITCODE=1"
goto FAIL

:PRIVATE_BACKEND_CONFIG_CLEANED
:ASK_BUILD_FRONTEND
echo.
echo 是否编译并复制前端到 DIST？
choice /c YN /n /m "Y=编译复制，N=跳过："
if errorlevel 2 goto ASK_BUILD_HELPER

if not exist "%FRONTEND%\package.json" goto NO_FRONTEND
where npm >nul 2>nul
if errorlevel 1 goto NO_NPM

echo.
echo 正在编译前端...
pushd "%FRONTEND%"
call npm run build
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & popd & goto FRONTEND_BUILD_FAILED
popd

if not exist "%FRONTEND%\dist" goto FRONTEND_DIST_MISSING
echo.
echo 正在复制前端构建结果到 DIST...
if exist "%DIST%\frontend" rd /s /q "%DIST%\frontend"
robocopy "%FRONTEND%\dist" "%DIST%\frontend" /MIR /NFL /NDL /NJH /NJS /NP
if errorlevel 8 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

:ASK_BUILD_HELPER
echo.
echo 是否编译 MAHO Helper 助手 exe 到 DIST？
choice /c YN /n /m "Y=编译，N=跳过："
if errorlevel 2 goto ASK_UNPACK_RUNTIME

if not exist "%HELPER%\package.json" goto NO_HELPER
where npm >nul 2>nul
if errorlevel 1 goto NO_NPM

echo.
echo 正在编译 MAHO Helper 单文件 exe...
pushd "%HELPER%"
call npm run tauri build -- --no-bundle
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & popd & goto FAIL
popd

if not exist "%HELPER%\src-tauri\target\release\helper.exe" goto HELPER_EXE_MISSING

echo.
echo 正在复制 MAHO Helper 到 DIST...
copy /y "%HELPER%\src-tauri\target\release\helper.exe" "%DIST%\MAHO Helper.exe" >nul
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL
:ASK_UNPACK_RUNTIME
echo.
echo 是否解压运行时环境到 DIST？
choice /c YN /n /m "Y=解压，N=跳过："
if errorlevel 2 goto SUCCESS
if not exist "%ZIP%" goto ZIP_MISSING

echo.
echo 正在解压运行时环境到 DIST...
if exist "%DIST%\runtime\env" rd /s /q "%DIST%\runtime\env"
if not exist "%DIST%\runtime" md "%DIST%\runtime"
md "%DIST%\runtime\env" 2>nul
tar -xf "%ZIP%" -C "%DIST%\runtime\env"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL

if not exist "%DIST%\runtime\env\Scripts\conda-unpack.exe" goto SUCCESS

echo.
echo 正在执行 conda-unpack...
call "%DIST%\runtime\env\Scripts\conda-unpack.exe"
if errorlevel 1 set "EXITCODE=%ERRORLEVEL%" & goto FAIL
goto SUCCESS

:SUCCESS
goto WRITE_START_SCRIPT

:WRITE_START_SCRIPT
echo.
echo 正在生成 DIST 一键启动脚本...
> "%DIST%\start.bat" echo @echo off
>> "%DIST%\start.bat" echo chcp 936 ^>nul
>> "%DIST%\start.bat" echo cd /d "%%~dp0"
>> "%DIST%\start.bat" echo set "PYTHONIOENCODING=utf-8"
>> "%DIST%\start.bat" echo if not exist "runtime\env\python.exe" goto NO_PYTHON
>> "%DIST%\start.bat" echo if not exist "backend\main.py" goto NO_BACKEND
>> "%DIST%\start.bat" echo if not exist "frontend\index.html" goto NO_FRONTEND
>> "%DIST%\start.bat" echo start "MAHO Backend" cmd /k "cd /d ""%%CD%%\backend"" ^&^& ""%%CD%%\runtime\env\python.exe"" ""main.py"""
>> "%DIST%\start.bat" echo start "MAHO Frontend" "runtime\env\python.exe" -m http.server 5173 --directory "frontend"
>> "%DIST%\start.bat" echo timeout /t 2 /nobreak ^>nul
>> "%DIST%\start.bat" echo start "" "http://127.0.0.1:5173"
>> "%DIST%\start.bat" echo exit /b 0
>> "%DIST%\start.bat" echo :NO_PYTHON
>> "%DIST%\start.bat" echo echo 未找到运行时 Python：runtime\env\python.exe
>> "%DIST%\start.bat" echo pause
>> "%DIST%\start.bat" echo exit /b 1
>> "%DIST%\start.bat" echo :NO_BACKEND
>> "%DIST%\start.bat" echo echo 未找到后端入口：backend\main.py
>> "%DIST%\start.bat" echo pause
>> "%DIST%\start.bat" echo exit /b 1
>> "%DIST%\start.bat" echo :NO_FRONTEND
>> "%DIST%\start.bat" echo echo 未找到前端文件：frontend\index.html
>> "%DIST%\start.bat" echo pause
>> "%DIST%\start.bat" echo exit /b 1
echo.
echo 构建完成。
echo 输出目录：
echo %DIST%
echo 打包文件：
echo %ZIP%
goto END

:NO_BACKEND
echo 未找到 backend 目录。
set "EXITCODE=1"
goto END

:NO_REQ
echo 未找到后端依赖文件：
echo %REQ%
set "EXITCODE=1"
goto END

:NO_FRONTEND
echo 未找到前端项目文件：
echo %FRONTEND%\package.json
set "EXITCODE=1"
goto END

:NO_HELPER
echo 未找到助手项目文件：
echo %HELPER%\package.json
set "EXITCODE=1"
goto END

:NO_NPM
echo 未找到 npm，请先安装 Node.js 后再构建前端或助手。
set "EXITCODE=1"
goto END

:FRONTEND_BUILD_FAILED
echo.
echo 前端构建失败，继续执行后续步骤。
set "EXITCODE=0"
goto ASK_BUILD_HELPER

:FRONTEND_DIST_MISSING
echo 前端构建完成后未找到 dist 目录：
echo %FRONTEND%\dist
set "EXITCODE=1"
goto END

:HELPER_EXE_MISSING
echo 助手构建完成后未找到 exe：
echo %HELPER%\src-tauri\target\release\helper.exe
set "EXITCODE=1"
goto END

:NO_CONDA
echo 未找到 Conda，请先安装 Miniconda 或 Anaconda 后再运行。
set "EXITCODE=1"
goto END

:NO_CONDA_BASE
echo 未能读取 Conda 安装路径。
set "EXITCODE=1"
goto END

:NO_CONDA_EXE
echo 未找到 Conda 可执行文件：
echo %CONDA_EXE%
set "EXITCODE=1"
goto END

:NO_PACK_ENV
echo 未输入环境路径。
set "EXITCODE=1"
goto END

:PACK_ENV_MISSING
echo 环境路径不存在：
echo %PACK_ENV%
set "EXITCODE=1"
goto END

:ZIP_MISSING
echo 未检测到打包文件：
echo %ZIP%
set "EXITCODE=1"
goto END

:CANCEL
echo 已取消。
set "EXITCODE=1"
goto END

:FAIL
echo.
echo 构建失败，退出码：
echo %EXITCODE%
goto END

:END
echo.
echo 脚本已结束，按任意键关闭窗口。
pause >nul
endlocal
exit /b %EXITCODE%
