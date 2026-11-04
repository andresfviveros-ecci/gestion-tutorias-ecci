from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from apps.reportes.views import IndicadoresPanelView

from .views import (
    ChangePasswordView,
    CoordinatorDetailView,
    CoordinatorView,
    LoginView,
    MeView,
    RecoveryTokenView,
    StudentDetailView,
    StudentView,
    TutorDetailView,
    TutorView,
)

urlpatterns = [
    # AUTENTICACIÓN
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    # RECUPERACIÓN DE CONTRASEÑA
    path('recovery/', RecoveryTokenView.as_view(), name='recovery'),
    # CRUD ESTUDIANTES
    path('estudiantes/', StudentView.as_view(), name='estudiantes'),
    path('estudiantes/<int:pk>/', StudentDetailView.as_view(), name='estudiante-detail'),
    # CRUD TUTORES
    path('tutores/', TutorView.as_view(), name='tutores'),
    path('tutores/<int:pk>/', TutorDetailView.as_view(), name='tutor-detail'),
    # CRUD COORDINADORES
    path('coordinadores/', CoordinatorView.as_view(), name='coordinadores'),
    path('coordinadores/<int:pk>/', CoordinatorDetailView.as_view(), name='coordinador-detail'),
    path('recovery/change-password/',ChangePasswordView.as_view(),name='change-password'),
    # PANEL DE COORDINACIÓN (la ruta es la que ya consulta el frontend)
    path('dashboard-stats/', IndicadoresPanelView.as_view(), name='dashboard-stats'),
]
