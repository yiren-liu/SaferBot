# Python built-in
from glob import glob
from typing import Counter
# from msilib.schema import Class
import pandas as pd
import pymysql
from google.protobuf.json_format import MessageToDict, MessageToJson
from google.oauth2.service_account import Credentials
from google.cloud import dialogflow_v2
import json
import random
import string
import sys
from time import strftime
import time
import uuid

# Django built-in
from django.utils import timezone
from django.views.generic import View
from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse, resolve
from django.contrib.auth import authenticate, login
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
# to disable CSRF validation for certain views
from django.views.decorators.csrf import csrf_exempt
# to disable CSRF validation for certain views
from django.utils.decorators import method_decorator
from django.http import StreamingHttpResponse

import requests

import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize,sent_tokenize
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.stem import WordNetLemmatizer
nltk.download('wordnet') 
nltk.download('omw-1.4')
nltk.download('punkt')
nltk.download('stopwords')

# Custom module
from .models import UserData, UserLog, CausalDiagram, RegressionResult
import mentorbot.data_utils as data_utils

# Global variables
from .config import endpoint, sagemaker_session, PREDICTOR, \
    EventPredictor, EVENTTYPE_INFERENCE_MODEL, \
        USE_LOCAL_ARG_MODEL, DEVICE, ARG2Q, ARG_MODEL


# dialogflow setup
KEY_FILE_PATH_DIALOGFLOW = "./api/your-api-key.json"
# set up dialogflow connection
credentials = Credentials.from_service_account_file(KEY_FILE_PATH_DIALOGFLOW)
session_client = dialogflow_v2.SessionsClient(credentials=credentials)

# AWS RDS setup

KEY_FILE_PATH_RDS = "./api/mentorbot-aws-rds.json"
with open(KEY_FILE_PATH_RDS, 'r', encoding='utf8') as file:
    data = json.load(file)





class MentorbotView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = 'mentorbot.html'
    condition = "treatment"
    context = "day_2"

    def get(self, request, *args, **kwargs):

        # saved_diagram = getCausalDiagram(
        #         username=request.user.username,
        #         context=context,
        #     )

        template_name = request.GET.get('template_name', self.template_name)
        context = request.GET.get('context', self.context)
        condition = request.GET.get('condition', self.condition)

        return render(request, template_name, {
            'condition': condition,
            'context': context,
            # 'saved_diagram': json.dumps(saved_diagram),
            # 'user_condition': user_condition,
        })

class SafetybotView(View):
    login_url = '/login/'
    template_name = 'safetybot.html'
    condition = "control"
    context = "safetybot"

    def get(self, request, *args, **kwargs):

        if not request.user.is_authenticated:
            # print('generate random username')
            username = 'temp_' + uuid.uuid4().hex[:10]
            raw_password = 'dummypassword'

            user = User.objects.create_user(username, '', raw_password)
            user.save()

            user = authenticate(username=username, password=raw_password)
            login(request, user)

            # assign user study group
            userdata = request.user.userdata
            if request.user.id & 1:
                userdata.condition = 'control'
            else:
                userdata.condition = 'treatment'
            # user_condition = userdata.condition
            userdata.save()

        template_name = request.GET.get('template_name', self.template_name)
        context = request.GET.get('context', self.context)
        condition = request.user.userdata.condition

        return render(request, template_name, {
            'condition': condition,
            'context': context,
            # 'saved_diagram': json.dumps(saved_diagram),
            # 'user_condition': user_condition,
        })

"""
    For Development (previously)
"""


class SignupView(View):
    template_name = "signup.html"
    default_next = '/login/'

    def get(self, request, *args, **kwargs):
        form = UserCreationForm()
        return render(request, 'signup.html', {'form': form})

    def post(self, request, *args, **kwargs):
        form = UserCreationForm(request.POST)
        # print(request.POST)
        # print(form)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)

            # # assign user study group
            # userdata = request.user.userdata
            # if request.user.id & 1:
            #     userdata.condition = 'control'
            # else:
            #     userdata.condition = 'treatment'
            # # user_condition = userdata.condition
            # userdata.save()

            return redirect(self.default_next)
        return render(request, 'signup.html', {'form': form})


class LoginView(View):
    template_name = "login.html"
    # default_next = 'welcome/'
    default_next = 'safetybot/'

    def get(self, request, *args, **kwargs):
        next_page = request.GET.get('next', self.default_next)

        return render(request, self.template_name, {
            'next': next_page,
        })

    def post(self, request, *args, **kwargs):
        user_name = request.POST['username']
        password = request.POST['password']
        next_page = request.POST.get('next', self.default_next)

        # use the Django built-in authentication system without password (because it nicely integrates with the request object)
        user = authenticate(username=user_name, password=password)

        if user is not None:
            login(request, user)

            # return redirect('/welcome/')
            return redirect('/safetybot/')
            # return HttpResponseRedirect(reverse('draw_diagram', args=('safety_draw',)))

        else:
            error_message = 'The username and password are invalid. Please try again.'
            return render(request, self.template_name, {'error_message': error_message})

            # below is the code used to create a user

            # # create the user
            # if user is None:
            #     user = User.objects.create_user(user_name, '', '')
            #     user.save()

            # # initialize user data table
            # userdata = user.userdata
            # userdata.condition = rand_condition()

            # # generate campaign_data
            # rand_seed = random.randint(10000, 99999)

            # # debug accounts
            # if user_name == 'control' or user_name == 'graph':
            #     userdata.condition = user_name
            # if user_name == 'seed1':
            #     userdata.condition = 'control'
            #     rand_seed = 1

            # campaign_data_config = data_utils.rand_generate_campaign_data(user_name, rand_seed)

            # # randomize variable order (success, goal, shares, category, country, length, duration, month)
            # random.seed(rand_seed)
            # campaign_data_config['variable_order'] = list(range(8))
            # random.shuffle(campaign_data_config['variable_order'])

            # userdata.campaign_data_config = json.dumps(campaign_data_config)

            # userdata.save()

            # # login the user
            # user = authenticate(username=user_name)
            # login(request, user)

            # return HttpResponseRedirect(reverse('draw_diagram', args=('safety_draw',)))


class ChatbotView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = 'diagram.html'
    # default_context = 'safety_app'
    default_context = 'diagram_canvas'
    default_crowd_intelligence = 'overview'

    def get(self, request, *args, **kwargs):

        # if GET specifies context, use it; otherwise, use default
        context = request.GET.get('context', self.default_context)

        # set options based on condition
        condition = request.GET.get(
            'condition', request.user.userdata.condition)

        crowd_intelligence = self.default_crowd_intelligence
        if condition == 'control':
            crowd_intelligence = 'none'
        elif condition == 'overview':
            crowd_intelligence = 'overview'
        elif condition == 'focus':
            crowd_intelligence = 'focus'

        # set options based on 'setting': the purpose of this parameter is to 'mask' the settings
        # so the subjects cannot guess what conditions they are on
        setting = request.GET.get('setting', None)
        if setting == 'A':
            crowd_intelligence = 'none'

        # if GET specifies the options, use them
        crowd_intelligence = request.GET.get(
            'crowd_intelligence', crowd_intelligence)

        saved_diagram = getCausalDiagram(
            username=request.user.username,
            context=context,
        )

        # peer_diagrams = {
        # "Crowd": getCausalDiagram(username='crowd', label='crowd', context=context), # if use crowd belief
        # }
        peer_diagrams = None

        return render(request, self.template_name, {
            'condition': condition,
            'context': context,
            'system_options': json.dumps({
                'crowd_intelligence': crowd_intelligence,
            }),
            'saved_diagram': json.dumps(saved_diagram),
            'peer_diagrams': json.dumps(peer_diagrams),
        })


class DiagramView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = 'diagram.html'
    default_context = 'safety_app'
    default_crowd_intelligence = 'overview'

    def get(self, request, *args, **kwargs):

        # if GET specifies context, use it; otherwise, use default
        context = request.GET.get('context', self.default_context)

        # set options based on condition
        condition = request.GET.get(
            'condition', request.user.userdata.condition)

        crowd_intelligence = self.default_crowd_intelligence
        if condition == 'control':
            crowd_intelligence = 'none'
        elif condition == 'overview':
            crowd_intelligence = 'overview'
        elif condition == 'focus':
            crowd_intelligence = 'focus'

        # set options based on 'setting': the purpose of this parameter is to 'mask' the settings
        # so the subjects cannot guess what conditions they are on
        setting = request.GET.get('setting', None)
        if setting == 'A':
            crowd_intelligence = 'none'

        # if GET specifies the options, use them
        crowd_intelligence = request.GET.get(
            'crowd_intelligence', crowd_intelligence)

        saved_diagram = getCausalDiagram(
            username=request.user.username,
            context=context,
        )

        peer_diagrams = {
            "Crowd": getCausalDiagram(username='crowd', label='crowd', context=context),
        }

        return render(request, self.template_name, {
            'condition': condition,
            'context': context,
            'system_options': json.dumps({
                'crowd_intelligence': crowd_intelligence,
            }),
            'saved_diagram': json.dumps(saved_diagram),
            'peer_diagrams': json.dumps(peer_diagrams),
        })


class DashboardView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = 'dashboard.html'

    def get(self, request, *args, **kwargs):
        context = 'safety_app'
        # check user type for permission
        user_type = request.user.userdata.user_type
        if user_type == 'turker':
            return HttpResponseRedirect(reverse('mturk_landing'))

        diagrams = CausalDiagram.objects.all()
        diagrams_data = list(map(
            lambda log: {
                'username': log.username,
                'context': log.context,
                'label': log.label,
            },
            CausalDiagram.objects
            .filter(context='safety_app', label='task_final')
            .order_by('username')
        ))

        subjects = UserData.objects.filter(
            user_type='subject',
            condition__in=['overview', 'focus', 'control'],
            user__username__startswith='P',
        ).order_by('user_id')
        # subjects = UserData.objects.all();

        subjects_info = list(map(
            lambda subject: {
                'username': subject.user.username,
                'condition': subject.condition,
            },
            subjects
        )
        )

        crowd_diagram = getCausalDiagram(
            username='crowd', label='crowd', context=context)
        dataset_diagram = getCausalDiagram(
            username='dataset', label='structure', context=context)
        return render(request, self.template_name, {
            'diagrams_data': diagrams_data,
            'subjects_info': json.dumps(subjects_info),
            'crowd_diagram': json.dumps(crowd_diagram),
            'dataset_diagram': json.dumps(dataset_diagram),
        })


class DrawDiagramView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = 'draw_diagram.html'
    default_task = 'safety_draw'

    def get(self, request, *args, **kwargs):
        task = kwargs.get('task', self.default_task)
        path = request.get_full_path()

        # debug
        if path == '/draw_diagram/safety_report_viz/':
            path = '/draw_diagram/safety_draw/'

        # Get the past saved diagram
        saved_diagram_log = UserLog.objects.filter(
            user=request.user,
            action='CAUSAL_DIAGRAM_SAVE',
            path=request.get_full_path(),
        ).order_by('-timestamp').first()

        if saved_diagram_log:
            saved_diagram = saved_diagram_log.message_json
        else:
            saved_diagram = '{}'  # JSON.parse("") in HTML would fail

        peer_diagrams = {
            "Crowd": extract_log_to_diagram('crowd', 'crowd'),
            "Peer 1": extract_log_to_diagram('peer0', 'peer'),
            "Peer 2": extract_log_to_diagram('peer1', 'peer'),
            "Peer 3": extract_log_to_diagram('peer2', 'peer'),
        }

        return render(request, self.template_name, {
            'task': task,
            'saved_diagram': saved_diagram,
            'peer_diagrams': json.dumps(peer_diagrams),
        })

# a demo page that does not require login


class DemoView(View):
    template_name = 'mediation-interface.html'
    task = 'campaign(X-M-Y)'
    condition = 'treatment'

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name, {
            'task': self.task,
            'condition': 'control',
            'campaigns_data_path': '',
            'variable_order': [],
            'interface_condition': self.condition
        })


# @login_required(login_url='/login/')
# def index(request):
#     userdata = UserData.objects.get(user_id=request.user.username)
#     print "user: ", request.user.username

#     return render(request, 'va-interface.html')

# a post request handler for the AJAX logging usage
@method_decorator(csrf_exempt, name='dispatch')
class LogView(LoginRequiredMixin, View):
    login_url = '/login/'

    def post(self, request, *args, **kwargs):
        action = request.POST.get('action', 'MISSING')
        command = request.POST.get('command', 'MISSING')
        session = request.POST.get('session', 'MISSING')
        print('command is ', command, 'session is ', session)
        if action == 'PAGELOAD':
            path = request.POST.get('path', 'MISSING')
            if path == 'MISSING':
                return JsonResponse({"status": "fail"})

            action = request.POST.get('action', '')
            msg = request.POST.get('msg', '""')
            time = timezone.now()
            record = {"timestamp": time.isoformat(), "path": path,
                      "action": action, "msg": msg}
            # print json.dumps(record)
            #print('current path is ', path)
            user_log = UserLog(
                user=request.user,
                timestamp=timezone.now(),
                path=path,
                action=action,
                message_json=msg,
            )
            user_log.save()
            if session == 'essay_writing':
                print('page load essay branch')
                fields = {
                    'user': request.user,
                    'timestamp': strftime('%Y-%m-%d %H:%M:%S'),
                    # 'content': request.POST.get('content'),
                    # 'submitted': request.POST.get('submitted'),
                }
                try:
                    rds_conn = pymysql.connect(host=RDS_DATA['host'], user=RDS_DATA['user'],
                           port=RDS_DATA['port'], password=RDS_DATA['password'], database=RDS_DATA['database'])
                    with rds_conn.cursor() as cursor:
                        sql_checking = "SELECT * FROM `essay` WHERE `user` = %s AND `submitted` = %s"
                        cursor.execute(sql_checking, (fields['user'], 'Y'))
                        if cursor.rowcount != 0:
                            result = cursor.fetchone()
                            #print('result is', result[3]) 
                            return JsonResponse({
                                'pageOnLoad': True,
                                'status': 'success',
                                'content': result[3],
                                'submitted': 'Y'
                            })
                        cursor.execute(sql_checking, (fields['user'], 'N'))
                        # Saved record does not exist
                        if cursor.rowcount != 0:
                            result = cursor.fetchone()
                            #print('result is', result[3])
                            return JsonResponse({
                                'pageOnLoad': True,
                                'status': 'success',
                                'content': result[3],
                                'submitted': 'N'
                            })
                    #print('not not 0')
                    rds_conn.close()
                    return JsonResponse({
                        'status': 'success',
                        'content': '',
                        'submitted': 'N'
                    })
                except:
                    return JsonResponse({
                        'status': 'failed',
                        'error': 'Failed to update database',
                        'content': '',
                        'submitted': 'N'
                    })
            elif session == 'mentorbot':
                print('page load feedback branch')
                fields = {
                    'user': request.user,
                    'timestamp': strftime('%Y-%m-%d %H:%M:%S'),
                    # 'content': request.POST.get('content'),
                    # 'submitted': request.POST.get('submitted'),
                }
                try:
                    rds_conn = pymysql.connect(host=RDS_DATA['host'], user=RDS_DATA['user'],
                           port=RDS_DATA['port'], password=RDS_DATA['password'], database=RDS_DATA['database'])
                    with rds_conn.cursor() as cursor:
                        sql_checking = "SELECT * FROM `feedback` WHERE `user` = %s AND `submitted` = %s"
                        cursor.execute(sql_checking, (fields['user'], 'N'))
                        # Saved record does not exist
                        if cursor.rowcount != 0:
                            result = cursor.fetchone()
                            return JsonResponse({
                                'pageOnLoad': True,
                                'status': 'success',
                                'content': result[3]
                            })
                    rds_conn.close()
                    return JsonResponse({
                        'status': 'success',
                        'content': ''
                    })
                except Exception as e: 
                    # print(e)
                    return JsonResponse({
                        'status': 'failed: ' + str(e),
                        'error': 'Failed to update database',
                        'content': ''
                    })

        if command == 'button_pressed':
            path = request.POST.get('path', 'MISSING')
            if path == 'MISSING':
                return JsonResponse({"status": "fail"})

            action = request.POST.get('action', '')
            msg = request.POST.get('msg', '""')
            time = timezone.now()
            record = {"timestamp": time.isoformat(), "path": path,
                      "action": action, "msg": msg}
            # print json.dumps(record)
            #print('current path is ', path)
            user_log = UserLog(
                user=request.user,
                timestamp=timezone.now(),
                path=path,
                action=action,
                message_json=msg,
            )
            user_log.save()
            if session == 'essay_writing':
                print('submission essay branch')
                fields = {
                    'user': request.user,
                    'timestamp': strftime('%Y-%m-%d %H:%M:%S'),
                    'content': request.POST.get('content'),
                    'submitted': request.POST.get('submitted'),
                }
                try:
                    rds_conn = pymysql.connect(host=RDS_DATA['host'], user=RDS_DATA['user'],
                           port=RDS_DATA['port'], password=RDS_DATA['password'], database=RDS_DATA['database'])
                    with rds_conn.cursor() as cursor:
                        sql_checking = "SELECT * FROM `essay` WHERE `user` = %s AND `submitted` = %s"
                        cursor.execute(sql_checking, (fields['user'], 'N'))
                        # Saved record does not exist
                        if cursor.rowcount == 0:
                            sql = "INSERT INTO `essay` (`user`, `timestamp`, `content`, `submitted`) VALUE (%s, %s, %s, %s)"
                            cursor.execute(
                                sql, (fields['user'], fields['timestamp'], fields['content'], fields['submitted']))
                        else:
                            sql = "UPDATE `essay` SET `timestamp` = %s, `content` = %s, `submitted` = %s WHERE `user` = %s AND `submitted` = %s"
                            cursor.execute(
                                sql, (fields['timestamp'], fields['content'], fields['submitted'], fields['user'], 'N'))
                    rds_conn.commit()
                    rds_conn.close()
                    return JsonResponse({
                        'status': 'success'
                    })
                except Exception as e:
                    return JsonResponse({
                        'status': 'failed: ' + str(e),
                        'error': 'Failed to update database',
                    })
            elif session == 'mentorbot':
                print('submission feedback branch')
                fields = {
                    # 'user': request.POST.get('user'),
                    'user': request.user,
                    'timestamp': strftime('%Y-%m-%d %H:%M:%S'),
                    'content': request.POST.get('content'),
                    'submitted': request.POST.get('submitted'),
                }
                try:
                    rds_conn = pymysql.connect(host=RDS_DATA['host'], user=RDS_DATA['user'],
                           port=RDS_DATA['port'], password=RDS_DATA['password'], database=RDS_DATA['database'])
                    with rds_conn.cursor() as cursor:
                        sql_checking = "SELECT * FROM `feedback` WHERE `user` = %s AND `submitted` = %s"
                        cursor.execute(sql_checking, (fields['user'], 'N'))
                        # Saved record does not exist
                        if cursor.rowcount == 0:
                            sql = "INSERT INTO `feedback` (`user`, `timestamp`, `content`, `submitted`) VALUE (%s, %s, %s, %s)"
                            cursor.execute(
                                sql, (fields['user'], fields['timestamp'], fields['content'], fields['submitted']))
                        else:
                            sql = "UPDATE `feedback` SET `timestamp` = %s, `content` = %s, `submitted` = %s WHERE `user` = %s AND `submitted` = %s"
                            cursor.execute(
                                sql, (fields['timestamp'], fields['content'], fields['submitted'], fields['user'], 'N'))
                    rds_conn.commit()
                    rds_conn.close()
                    return JsonResponse({
                        'status': 'success'
                    })
                except:
                    return JsonResponse({
                        'status': 'failed',
                        'error': 'Failed to update database',
                    })

        if command == 'auto_save':
            if session == 'essay_writing':
                print('auto saving essay branch')
                fields = {
                    'user': request.user,
                    'timestamp': strftime('%Y-%m-%d %H:%M:%S'),
                    'content': request.POST.get('content'),
                    'submitted': request.POST.get('submitted'),
                }
                try:
                    rds_conn = pymysql.connect(host=RDS_DATA['host'], user=RDS_DATA['user'],
                           port=RDS_DATA['port'], password=RDS_DATA['password'], database=RDS_DATA['database'])
                    with rds_conn.cursor() as cursor:
                        sql_checking = "SELECT * FROM `essay` WHERE `user` = %s AND `submitted` = %s"
                        cursor.execute(sql_checking, (fields['user'], 'N'))
                        # Saved record does not exist
                        if cursor.rowcount == 0:
                            sql = "INSERT INTO `essay` (`user`, `timestamp`, `content`, `submitted`) VALUE (%s, %s, %s, %s)"
                            cursor.execute(
                                sql, (fields['user'], fields['timestamp'], fields['content'], 'N'))
                        else:
                            sql = "UPDATE `essay` SET `timestamp` = %s, `content` = %s WHERE `user` = %s AND `submitted` = %s"
                            cursor.execute(
                                sql, (fields['timestamp'], fields['content'], fields['user'], 'N'))
                    rds_conn.commit()
                    rds_conn.close()
                    return JsonResponse({
                        'status': 'success'
                    })
                except Exception as e:
                    return JsonResponse({
                        'status': 'failed: ' + str(e),
                        'error': 'Failed to update database',
                    })
            elif session == 'mentorbot':
                print('auto saving feedback branch')
                fields = {
                    # 'user': request.POST.get('user'),
                    'user': request.user,
                    'timestamp': strftime('%Y-%m-%d %H:%M:%S'),
                    'content': request.POST.get('content'),
                    'submitted': request.POST.get('submitted'),
                }
                try:
                    rds_conn = pymysql.connect(host=RDS_DATA['host'], user=RDS_DATA['user'],
                           port=RDS_DATA['port'], password=RDS_DATA['password'], database=RDS_DATA['database'])
                    with rds_conn.cursor() as cursor:
                        sql_checking = "SELECT * FROM `feedback` WHERE `user` = %s AND `submitted` = %s"
                        cursor.execute(sql_checking, (fields['user'], 'N'))
                        # Saved record does not exist
                        if cursor.rowcount == 0:
                            sql = "INSERT INTO `feedback` (`user`, `timestamp`, `content`, `submitted`) VALUE (%s, %s, %s, %s)"
                            cursor.execute(
                                sql, (fields['user'], fields['timestamp'], fields['content'], 'N'))
                        else:
                            sql = "UPDATE `feedback` SET `timestamp` = %s, `content` = %s WHERE `user` = %s AND `submitted` = %s"
                            cursor.execute(
                                sql, (fields['timestamp'], fields['content'], fields['user'], 'N'))
                    rds_conn.commit()
                    rds_conn.close()
                    return JsonResponse({
                        'status': 'success'
                    })
                except Exception as e: 
                    # print(e)
                    return JsonResponse({
                        'status': 'failed: ' + str(e),
                        'error': 'Failed to update database',
                    })
        else:
            print('irrelevant branch')
            path = request.POST.get('path', 'MISSING')
            if path == 'MISSING':
                return JsonResponse({"status": "fail"})

            action = request.POST.get('action', '')
            msg = request.POST.get('msg', '""')
            time = timezone.now()
            record = {"timestamp": time.isoformat(), "path": path,
                      "action": action, "msg": msg}
            # print json.dumps(record)
            #print('current path is ', path)
            user_log = UserLog(
                user=request.user,
                timestamp=timezone.now(),
                path=path,
                action=action,
                message_json=msg,
            )
            user_log.save()

            return JsonResponse({"status": "success"})
        # # TODO: unreliable to save logs in this way. concurrent log requests will result in overwriting. change to save logs as new entry in database
        # userdata = UserData.objects.get(user=request.user)
        # logs = json.loads(userdata.logs)
        # logs.append(record)
        # userdata.logs = json.dumps(logs)
        # userdata.save()

        # return JsonResponse({"status": "success"})

# a post request handler for the AJAX general usage (except log)
# class AjaxView(LoginRequiredMixin, View):


@method_decorator(csrf_exempt, name='dispatch')
class AjaxView(View):  # do not require login
    login_url = '/login/'

    def post(self, request, *args, **kwargs):
        global PREDICTOR, endpoint
        # print(request.POST)
        command = request.POST.get('command', 'MISSING')
        if command == 'MISSING':
            return JsonResponse({"status": "fail"})
        # post chat message to all
        elif command == 'post_chat':
            fields = {
                'message': request.POST.get('message'),
                'user': request.POST.get('user'),
                'dialogflow_projectid': request.POST.get('dialogflow_projectid'),
                'dialogflow_sessionid': request.POST.get('user'),
                'event': request.POST.get('event'),
            }

            # send to dialogflow
            session = session_client.session_path(
                fields['dialogflow_projectid'], fields['dialogflow_sessionid'])
            # print("Session path: {}\n".format(session))

            # send to dialogflow for intent detection
            text_input = dialogflow_v2.TextInput(
                text=fields['message'][:200], language_code='en-US')

            event_name = fields['event']
            if event_name:
                event = {
                    'name': event_name,
                    'language_code': 'en-US',
                }
                query_input = dialogflow_v2.QueryInput(
                    text=text_input, event=event)
            else:
                query_input = dialogflow_v2.QueryInput(text=text_input)

            # print(query_input)
            response = session_client.detect_intent(
                request={"session": session, "query_input": query_input}
            )
            response = MessageToDict(response._pb)
            # print(response)

            actionType = None
            if 'action' in response['queryResult']:
                actionType = response['queryResult']['action'].split('.')[0]

            # print(actionType)

            if actionType == 'smalltalk':
                intent = 'smalltalk'
                replies = response['queryResult']['fulfillmentMessages'][0]['text']['text']
                actions = []
                clickables = []
            elif 'text' in response['queryResult']['fulfillmentMessages'][0]:
                intent = response['queryResult']['intent']['displayName']
                return JsonResponse({
                'status': 'success',
                'intent': intent,
                "replies": response['queryResult']['fulfillmentMessages'][0]['text']['text'],
                "actions": [],
                "clickables": [],
                # "end_flag": end_flag,
            })
            else:
                intent = response['queryResult']['intent']['displayName']
                replies = response['queryResult']['fulfillmentMessages'][0]['payload']['reply']
                actions = response['queryResult']['fulfillmentMessages'][0]['payload']['action']
                clickables = response['queryResult']['fulfillmentMessages'][0]['payload']['clickable']
                # end_flag = response['queryResult']['diagnosticInfo']['end_conversation']
                # print(replies)

            return JsonResponse({
                'status': 'success',
                'intent': intent,
                "replies": replies,
                "actions": actions,
                "clickables": clickables,
                # "end_flag": end_flag,
            })
        elif command == 'get_feedback_quality':
            fields = {
                'message': request.POST.get('message'),
            }

            text = fields['message']
            quality = 0

            # if word count < 20, quality is 0; otherwise 1
            wordCount = len(text.split(' '))
            if wordCount >= 20:
                quality = 1

            # if first time user, assign role name
            # 0 -> fail, 1 -> pass
            userdata = UserData.objects.get(user=request.user)
            if userdata.condition not in {'pass', 'fail'}:
                if quality == 0:
                    userdata.condition = 'fail'
                elif quality == 1:
                    userdata.condition = 'pass'
                userdata.save()

            return JsonResponse({
                'status': 'success',
                'quality': quality,
            })
        elif command == "extract_event_args":
            fields = {
                'message': request.POST.get('message'),
                'user': request.POST.get('user'),
                'args': request.POST.get('args'),
            }

            text = fields['message']
            args = fields['args']

            arg2q = ARG2Q

            q_index = list(arg2q.keys())
            payload = {
                'inputs': [{"question": arg2q[arg], "context": text} for arg in arg2q]
            }
            
            if USE_LOCAL_ARG_MODEL:
                try: 
                    answers, offsets = ARG_MODEL.predict_slot(text)
                    print(answers)
                    print(offsets)
                    error = None
                except Exception as e:
                    print(e)
                    answers = dict(zip(q_index, ['LOCAL ARG MODEL FAILURE']*len(q_index)))
                    offsets = dict(zip(q_index, [(0, 0)]*len(q_index)))
                    error = str(e)
                # raise Exception("Local arg model is not implemented yet")
            else:
                try:
                    PREDICTOR = EventPredictor(endpoint, sagemaker_session=sagemaker_session)
                    inference_response = PREDICTOR.predict(payload)
                    print (inference_response) # [{'score': 0.9326569437980652, 'start': 11, 'end': 16, 'answer': 'Clara'}]

                    answers = [d['answer'] if d['score']>0.01 else '' for d in inference_response]
                    answers = dict(zip(q_index, answers))

                    offsets = [(d['start'], d['end']) if d['score']>0.01 else (0, 0) for d in inference_response]
                    offsets = dict(zip(q_index, offsets))
                    error = None
                except Exception as e:
                    print(e)
                    answers = dict(zip(q_index, ['not started yet']*len(q_index)))
                    offsets = dict(zip(q_index, [(0, 0)]*len(q_index)))
                    error = str(e)

            return JsonResponse({
                'status': 'success',
                'answers': answers,
                'offsets': offsets,
                'error': error,
            })
        elif command == "check_event_system_status":
            status = 'Offline'
            # print(PREDICTOR)
            PREDICTOR = EventPredictor(endpoint, sagemaker_session=sagemaker_session)
            status = PREDICTOR.get_endpoint_status()
            return JsonResponse({
                'status': 'success',
                'system_status': status,
            })
        elif command == "start_endpoint":
            endpoint = sagemaker_session.create_endpoint('LiveSafe', 'huggingface-pytorch-inference-2022-01-24-20-43-27-614')
            PREDICTOR = EventPredictor(endpoint, sagemaker_session=sagemaker_session)

            return JsonResponse({
                'status': 'success',
            })
        elif command == "delete_endpoint":
            sagemaker_session.delete_endpoint(endpoint)
            return JsonResponse({
                'status': 'success',
            })
        elif command == "check_mental_negativity":
            text = request.POST.get('message')
            mental_check_pass = True

            sent = SentimentIntensityAnalyzer()
            polarity = round(sent.polarity_scores(text)['compound'], 2)
            # print(polarity)

            if polarity < 0:
                mental_check_pass = False

            return JsonResponse({
                'status': 'success',
                'mental_check_pass': mental_check_pass,
                'polarity': polarity,
            })
        elif command == "infer_event_type":
            text = request.POST.get('message')
            # first, do lexicon based word matching
            lexicon = {
                'attack': ['attack'],
                'gunshot': ['gunshot'],
                'assault': ['assault', 'harassment', 'harass'],
                'abuse': ['abuse'],
                'drug': ['drug', 'weed', 'alcohol'],
                'carjacking': ['carjack', 'vehicle', 'car'],
                'theft': ['theft', 'stolen', 'steal', 'rob'],
                'noise': ['noise'],
            }
            # reverse lexicon dict
            word2eventType = {w: k for k in lexicon for w in lexicon[k]}
            counter = Counter({k: 0 for k in lexicon})

            # tokenize and lemmatize
            words = nltk.word_tokenize(text)
            stop_words = set(stopwords.words('english'))
            final_tokens = []
            for each in words:
                if each not in stop_words:
                    final_tokens.append(each)
            lemmatizer = WordNetLemmatizer()
            lemmatized_words = [lemmatizer.lemmatize(word, 'v') for word in final_tokens] 
            # print('lemmatized words' + str(lemmatized_words))
            for word in lemmatized_words:
                if word in word2eventType:
                    counter.update([word2eventType[word]])
            most_common_type, num_most_common = counter.most_common(1)[0]
            # print(counter)

            if num_most_common > 0:
                inferred_eventType = most_common_type
                ranked_eventTypes = [k for k, _ in counter.most_common()]
                ranked_probs = [n for _, n in counter.most_common()]
                total = sum(ranked_probs)
                ranked_probs = [round(n/total, 2) for n in ranked_probs]
            else:
                inferred_eventType = ''
                # infer using the prediction model
                inferred_eventType, ranked_eventTypes, ranked_probs = EVENTTYPE_INFERENCE_MODEL.predict(text)
                
            return JsonResponse({
                'status': 'success',
                'inferred_eventType': inferred_eventType,
                'ranked_eventTypes': ranked_eventTypes,
                'ranked_probs': ranked_probs,
            })
        else:
            return JsonResponse({
                "status": "fail",
            })



# a page showing the associated userdata


class UserDataView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = "userdata.html"

    def get(self, request, *args, **kwargs):
        userdata = UserData.objects.get(user=request.user)
        userdata.logs = json.loads(userdata.logs)
        for log in userdata.logs:
            log['msg'] = json.loads(log['msg'])
        return render(request, self.template_name, {'userdata': userdata})

# a page showing the all of the userdata for admin use


class SiteDataView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = "sitedata.html"

    def get(self, request, *args, **kwargs):
        # if request.user.username != 'admin_ericyen':
        #     return HttpResponseRedirect(reverse('userdata'))

        userdata_all = UserData.objects.all()
        return render(request, self.template_name, {'userdata_all': userdata_all})

# a generic simple static page view


class StaticPageView(LoginRequiredMixin, View):
    login_url = '/login/'
    template_name = ''

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name)

# SSEs below
# stream for sse push diagram to user


def stream_diagram(request):
    def event_stream(event='message'):
        while True:
            # wait for source data to be available, then push it.
            time.sleep(1)
            diagram_json = Q_msg.get()
            # print('Queue fetched!')
            # print('event: %s\ndata: %s\n\n'%(event, data))
            yield 'event: %s\ndata: %s\n\n' % (event, diagram_json)
    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

# stream every chat msg to user/wizard


def stream_chatbot(request):
    def event_stream(event='message'):
        while True:
            pubsub = red.pubsub()
            pubsub.subscribe('chat')
            # TODO: handle client disconnection.
            for message in pubsub.listen():
                print(message)
                if message['type'] == 'message':
                    yield 'data: %s\n\n' % message['data'].decode('utf-8')
    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

# This function filters all UserData rows by the specified conditions, then randomly select
# one of the conditions that have the least number of subjects.


def get_rand_condition(conditions, **kwargs):
    counts = [UserData.objects.filter(
        condition=c, **kwargs).count() for c in conditions]
    choices = [i for i in range(len(conditions)) if counts[i] == min(counts)]
    return conditions[random.choice(choices)]


# return the variable and causal diagram info from database based on username and label
def extract_log_to_diagram(username, label):
    log = CausalDiagram.objects.filter(username=username, label=label).first()
    if log:
        return {
            'variable_diagram': {
                'variables': json.loads(log.variables_json),
                'causal_diagram': json.loads(log.causal_diagram_json),
            }
        }
    else:
        return {}

# This function applies the filter kwargs to get the latest CausalDiagram data and returns as a dictionary


def getCausalDiagram(**kwargs):
    log = CausalDiagram.objects.filter(**kwargs).order_by('-timestamp').first()
    return diagramLog2Dict(log)


def diagramLog2Dict(log):
    if log:
        return {
            'variable_diagram': {
                'variables': json.loads(log.variables_json),
                'causal_diagram': json.loads(log.causal_diagram_json),
            }
        }
    else:
        return {}

#


def get_random_alphanumeric_string(length):
    letters_and_digits = string.ascii_letters + string.digits
    result_str = ''.join((random.choice(letters_and_digits)
                         for i in range(length)))
    return result_str
