#!/usr/bin/env python3
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'customer.settings')
if 'runserver' in sys.argv:
    address = next((arg for arg in sys.argv[2:] if not arg.startswith('-')), '127.0.0.1:4188')
    if not address.startswith(('127.0.0.1:', 'localhost:')):
        raise SystemExit('This development server must bind to loopback only.')
from django.core.management import execute_from_command_line
execute_from_command_line(sys.argv)
