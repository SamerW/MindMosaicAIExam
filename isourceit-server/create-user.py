import hashlib
import types
from argparse import ArgumentParser
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.User import User


def setup_argument_parser() -> ArgumentParser:
    parser = ArgumentParser(description="Create a local user (teacher or admin)")
    parser.add_argument('-a', '--admin', help='Mark user as admin (not teacher)', action='store_true')
    parser.add_argument('-p', '--password', help="User's password", metavar='user password', type=str, required=True)
    parser.add_argument('-c', '--config', help="Configuration file location (default: ./config.py)",
                        metavar='<configuration file>', type=str, default='./config.py')
    parser.add_argument('username', help="user username", metavar='<username>', type=str)
    return parser


def read_config_file(config_path: str):
    d = types.ModuleType("config")
    d.__file__ = config_path
    try:
        with open(config_path, mode="rb") as config_file:
            exec(compile(config_file.read(), config_path, "exec"), d.__dict__)
        configuration = dict()
        for key in dir(d):
            if key.isupper():
                configuration[key] = getattr(d, key)
        return configuration
    except OSError as e:
        e.strerror = f"Unable to load configuration file ({e.strerror})"
        raise


def create_user(username: str, raw_password: str, is_admin: bool = False) -> User:
    if not username or not raw_password:
        raise Exception('Cannot create user: username and password must be given')
    password = hashlib.sha3_512(raw_password.encode()).hexdigest()
    role = 'admin' if is_admin else 'teacher'
    return User(username=username, password=password, role=role)


if __name__ == '__main__':
    arg_parser = setup_argument_parser()
    args = arg_parser.parse_args()
    config = read_config_file(args.config)
    user_to_create = create_user(args.username, args.password, args.admin)
    with MongoDAO(MongoDAO.compute_dao_options_from_app(config)) as mongo_dao:
        res = mongo_dao.user_col.insert_one(user_to_create)
        print("User created with id <{}>".format(repr(res.inserted_id)))
