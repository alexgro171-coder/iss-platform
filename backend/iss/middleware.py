"""
Middleware pentru a face request-ul curent disponibil în signals.
Folosește thread-local storage pentru a păstra referința la request.
"""

import threading

# Thread-local storage pentru request și user
_thread_locals = threading.local()


def get_current_request():
    """Returnează request-ul curent din thread-local storage."""
    return getattr(_thread_locals, 'request', None)


def get_current_user():
    """Returnează user-ul curent din thread-local storage."""
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None


class CurrentRequestMiddleware:
    """
    Middleware care salvează request-ul curent în thread-local storage.
    Permite accesul la request din signals și alte locuri unde nu e disponibil direct.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Salvăm request-ul în thread-local
        _thread_locals.request = request
        
        try:
            response = self.get_response(request)
        finally:
            # Curățăm după ce request-ul e procesat
            if hasattr(_thread_locals, 'request'):
                del _thread_locals.request
        
        return response

