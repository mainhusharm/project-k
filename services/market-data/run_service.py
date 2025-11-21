#!/usr/bin/env python3
"""
Script to run the YFinance Market Data Service
"""

import subprocess
import sys
import os
import signal

def main():
    print("🚀 Starting YFinance Market Data Service...")

    # Change to the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Run the Python service using the virtual environment
    try:
        venv_dir = '../../.venv'
        if os.path.exists(venv_dir):
            process = subprocess.Popen([
                sys.executable,
                '-m', 'uv',
                'run',
                '--project', venv_dir,
                'python', 'market_data_service.py'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        else:
            # Fallback to direct python
            process = subprocess.Popen([
                sys.executable,
                'market_data_service.py'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        print(f"✅ Service started with PID: {process.pid}")

        # Keep running and monitor
        while True:
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                if stdout:
                    print("Service Output:", stdout.decode())
                if stderr:
                    print("Service Error:", stderr.decode())
                print("Service stopped. Restarting...")
                process = subprocess.Popen([
                    sys.executable,
                    'market_data_service.py'
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            import time
            time.sleep(5)

    except KeyboardInterrupt:
        print("\n🛑 Stopping Market Data Service...")
        if process:
            process.terminate()
            process.wait()
        print("✅ Service stopped")
        sys.exit(0)

if __name__ == '__main__':
    main()
