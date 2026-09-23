from django.urls import path
from .views import *

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('recovery/', RecoveryTokenView.as_view(), name='recovery'),
]