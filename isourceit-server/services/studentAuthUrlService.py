from flask import current_app


def generate_auth_generation_url(exam_type: str, exam_id: str):
    # Attempt to get parametric url from app config
    gen_url = current_app.config['APP_COMPOSITION_AUTH_GENERATION_URL']
    return gen_url.replace(':exam_type', exam_type).replace(':exam_id', exam_id)


def generate_auth_validation_url(ticket: str):
    val_url = current_app.config['APP_COMPOSITION_AUTH_VALIDATION_URL']
    return val_url.replace(':ticket', ticket)
