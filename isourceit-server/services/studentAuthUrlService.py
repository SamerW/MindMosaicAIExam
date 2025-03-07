from flask import current_app


import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't actually have to connect, just used to get local IP
        s.connect(('10.255.255.255', 1))
        local_ip = s.getsockname()[0]
        return local_ip
    except Exception:
        local_ip = 'localhost'
        return local_ip
    finally:
        s.close()

def generate_auth_generation_url(exam_type: str, exam_id: str):
    # Attempt to get parametric url from app config
    gen_url = current_app.config['APP_COMPOSITION_AUTH_GENERATION_URL']
    #ip_address = get_local_ip() if get_local_ip() is not None else "localhost"
    ip_address = 'localhost'
    return gen_url.replace(':exam_type', exam_type).replace(':exam_id', exam_id).replace(':ip_address',ip_address)


def generate_auth_validation_url(ticket: str):
    val_url = current_app.config['APP_COMPOSITION_AUTH_VALIDATION_URL']
    #ip_address = get_local_ip() if get_local_ip() is not None else "localhost"
    ip_address = 'localhost'
    return val_url.replace(':ticket', ticket).replace(':ip_address',ip_address)
