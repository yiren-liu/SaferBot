from glob import glob

import mentorbot.views
from django.conf.urls import url
from django.urls import path


from django.contrib.auth import views as auth_views
from django.contrib import admin
admin.autodiscover()


urlpatterns = [
    # url(r'^$', mentorbot.views.VisualAnalyticsView.as_view(task='campaign'), name='task'),
    path('', mentorbot.views.LoginView.as_view()),  # default page
    # path('', mentorbot.views.SafetybotView.as_view(
    #     template_name='safetybot.html', condition='', context=''
    # ), name='safetybot'),  # default page

    path('demo/', mentorbot.views.DemoView.as_view(task='campaign(X-MY)'), name='demo'),
    path('login/', mentorbot.views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='/login/'), name='logout'),
    path('signup/', mentorbot.views.SignupView.as_view(), name='signup'),

    # below is a new page to replace draw_diagram for a more generic system page
    path('diagram/', mentorbot.views.DiagramView.as_view(), name='diagram'),
    # path('dashboard/', mentorbot.views.DashboardView.as_view(), name='dashboard'),
    # path('chatbot/post_chat/', mentorbot.views.post_chat, name='post_chat'), # for sending message to chatbot server

    # for crowdsourcing causal diagram study
    # https://docs.djangoproject.com/en/3.0/topics/http/urls/
    # note 'url()' is replaced with the new function 'path()' introduced in Django 2

    # path('draw_diagram/<str:task>/', mentorbot.views.DrawDiagramView.as_view(), name='draw_diagram'),
    # url(r'^draw_diagram/', mentorbot.views.DrawDiagramView.as_view(), name='draw_diagram'),
    # path('finish/', mentorbot.views.StaticPageView.as_view(template_name='finish.html'), name='finish'),

    # mentor bot webpage
    path('welcome/', mentorbot.views.MentorbotView.as_view(
        template_name='welcome.html', condition='treatment', context='day_1'
    ), name='welcome'),
    path('mentorbot/', mentorbot.views.MentorbotView.as_view(
        template_name='mentorbot_day_2.html', condition='treatment', context='day_2'
    ), name='mentorbot'),
    # path('mentorbot_day_3/', mentorbot.views.MentorbotView.as_view(
    #     template_name='mentorbot_day_3.html', condition='treatment', context='day_3'
    # ), name='mentorbot_comparison'),
    # path('mentorbot_day_4/', mentorbot.views.MentorbotView.as_view(
    #     template_name='mentorbot_day_4.html', condition='treatment', context='day_4'
    # ), name='mentorbot_mentor'),

    # for user study
    path('user_study_mentorbot_day_2/', mentorbot.views.MentorbotView.as_view(
        template_name='user_study_essay_writing.html', condition='treatment', context='day_2'
    ), name='user_study_essay_writing_day_2'),
    # path('user_study/mentorbot_day_3/', mentorbot.views.MentorbotView.as_view(
    #     template_name='user_study_essay_writing.html', condition='treatment', context='day_3'
    # ), name='user_study_essay_writing_day_3'),


    # for safety bot
    path('safetybot/', mentorbot.views.SafetybotView.as_view(
        template_name='safetybot.html', condition='', context=''
    ), name='safetybot'),  
    path('safetybot/user_study', mentorbot.views.SafetybotView.as_view(
        template_name='safetybot_scenario.html', condition='', context=''
    ), name='safetybot'), 
    path('system_control/', mentorbot.views.MentorbotView.as_view(
        template_name='system_control.html', condition='', context=''
    ), name='system_control'),


    # url(r'^control/', mentorbot.views.DemoView.as_view(task='admission(X-Y)', condition='control'), name='mediation'),
    url(r'^log/', mentorbot.views.LogView.as_view(), name='log'),
    url(r'^ajax/', mentorbot.views.AjaxView.as_view(), name='ajax'),
    url(r'^userdata/', mentorbot.views.UserDataView.as_view(), name='userdata'),
    # url(r'^sitedata/', mentorbot.views.SiteDataView.as_view(), name='sitedata'),
    # url(r'^presurvey/', mentorbot.views.StaticPageView.as_view(template_name='presurvey.html'), name='presurvey'),
    # url(r'^postsurvey/', mentorbot.views.StaticPageView.as_view(template_name='postsurvey.html'), name='postsurvey'),
    # url(r'^tracevisualize/', mentorbot.views.StaticPageView.as_view(template_name='tracevisualize.html'), name='tracevisualize'),
    path('admin/', admin.site.urls),
]
