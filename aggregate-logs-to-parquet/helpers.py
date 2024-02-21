import json

def isJson(myjson):
    try:
        json_object = json.loads(myjson)
    except ValueError as e:
        return False
    return True