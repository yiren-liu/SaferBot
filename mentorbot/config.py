# import queue
# import redis
# global redis db
# red = redis.StrictRedis()

# queue for sse msg to user
# Q_msg = queue.Queue()

# from multiprocessing import Queue
# Q_msg = Queue()


# For local argument extraction model
ARG2Q = {
    'suspect': "who is the suspect?", 
    'suspect-age': "How old is the suspect?", 
    'suspect-race': "What is the suspect's race or ethnicity?", 
    'suspect-clothing': "What is the suspect wearing?", 
    'suspect-sex': "What is the suspect's gender?", 
    'suspect-movement': "Where did the suspect go?", 
    'instrument': "What weapon did the suspect carry?", 
    'location': "where did this happen?", 
    'time': "when did this happen?",
    'victim-name': 'What is the name of the victim?',
    'victim-phone': 'What is the phone number of the victim?',
    'vehicle-plate': 'What is the plate number of the vehicle?',
    'vehicle-color': 'What is the color of the vehicle?',
    'vehicle-make': 'What is the make of the vehicle?', 
    'vehicle-model': 'What is the model of the vehicle?',
    'item-stolen': 'What items were stolen?', 
    'item-price': 'How much is the price of the stolen items?',
}

import os
import time
import torch
from .arg_models import EventArgumentModel
USE_LOCAL_ARG_MODEL = True
# DEVICE = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
if USE_LOCAL_ARG_MODEL:
    model_name = 'yirenl2/plm_qa'
    # model_name = 'deepset/roberta-base-squad2'
    ARG_MODEL = EventArgumentModel(model_name, device=DEVICE)
# test for ARG_MODEL
text = "I was attacked by a tall young man in front of the bus station."
ARG_MODEL.update_template_dict(ARG2Q)

# time the prediction
start = time.time()
slots_pred, offsets_dict = ARG_MODEL.predict_slot(text)
end = time.time()

print(slots_pred) 
# {'suspect': [' a tall young man'], 'suspect-age': [], 
# 'suspect-race': [], 'suspect-clothing': [], 'suspect-sex': [], 
# 'suspect-movement': [' in front of the bus station'], 
# 'instrument': [], 'location': [' in front of the bus station'], 
# 'time': [' in front of the bus station'], 'victim-name': [], 
# 'victim-phone': [], 'vehicle-plate': [], 'vehicle-color': [], 
# 'vehicle-make': [], 'vehicle-model': [], 'item-stolen': [], 
# 'item-price': []}
print(end - start)

# raise NotImplementedError

# For event argument extraction with sagemaker backend
import sagemaker
from sagemaker.huggingface import HuggingFacePredictor
import boto3
from sagemaker.deserializers import JSONDeserializer
from sagemaker.serializers import JSONSerializer

from .inference.logistic_regression import LogisticRegressionEventType

# Sagemaker setup
class EventPredictor(HuggingFacePredictor):
    def __init__(
        self,
        endpoint_name,
        sagemaker_session=None,
        serializer=JSONSerializer(),
        deserializer=JSONDeserializer(),
    ):
        super(EventPredictor, self).__init__(
            endpoint_name, sagemaker_session, serializer, deserializer,
        )
    
    def get_test_response(self):
        payload = {
            'inputs': [
                {
                "question": "What's my name?",
                "context": "My name is Clara and I live in Berkeley.",
            },
            ]
        }
        request_args = self._create_request_args(payload)
        try:
            response = self.sagemaker_session.sagemaker_runtime_client.invoke_endpoint(**request_args)
        except Exception as e:
            response = {'Body': {"ErrorCode": e}}
        return response
    
    def get_endpoint_status(self):
        response = self.get_test_response()
        if type(response) is dict:
            body = response['Body']
        else:
            body = response['Body'].read().decode('utf-8')
        if "ErrorCode" in body:
            return "Offline"
        else:
            return "Online"

# Sagemaker setup
global PREDICTOR
PREDICTOR = None
try:
    boto_session = boto3.Session(
        aws_access_key_id="YOUR_ACCESS_KEY",
        aws_secret_access_key="YOUR_SECRET_KEY",
        region_name="us-east-2",
    )
    sagemaker_session = sagemaker.Session(boto_session=boto_session)
    sagemaker_runtime = sagemaker_session.sagemaker_runtime_client
    endpoint = 'YOUR_ENDPOINT_NAME'
    PREDICTOR = EventPredictor(endpoint, sagemaker_session=sagemaker_session)
    inference_response = PREDICTOR.get_test_response()
    print(inference_response) # [{'score': 0.9326569437980652, 'start': 11, 'end': 16, 'answer': 'Clara'}]
    print(inference_response['ResponseMetadata']['HTTPStatusCode']) # [{'score': 0.9326569437980652, 'start': 11, 'end': 16, 'answer': 'Clara'}]
    print(inference_response['Body'].read().decode('utf-8')) # [{'score': 0.9326569437980652, 'start': 11, 'end': 16, 'answer': 'Clara'}]
except Exception as e:
    print("Error: " + str(e))


# event type inference model set up
global EVENTTYPE_INFERENCE_MODEL
EVENTTYPE_INFERENCE_MODEL = LogisticRegressionEventType()



