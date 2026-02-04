from app.database import db
from app.services.auth_service import AuthService
import time

try:
    # Use unique email based on current time
    unique_email = f'test{int(time.time())}@example.com'
    user = AuthService.register_user(unique_email, f'user{int(time.time())}', 'Test@1234')
    if user:
        print('User registered:', user.get('email'), user.get('username'))
    else:
        print('User already exists or error')
except Exception as e:
    print(f'Error: {type(e).__name__}: {str(e)}')
    import traceback
    traceback.print_exc()
