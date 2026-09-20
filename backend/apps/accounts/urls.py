from django.urls import path
from .views import LoginView, RecoveryTokenView, StudentView, TutorView, CoordinatorView

urlpatterns = [
    # AUTENTICACIÓN
    path('login/', LoginView.as_view(), name='login'),
    # RECUPERACIÓN DE CONTRASEÑA
    path('recovery/', RecoveryTokenView.as_view(), name='recovery'),
    # CRUD ESTUDIANTES
    path('estudiantes/', StudentView.as_view(), name='estudiantes'),
    path('estudiantes/<int:pk>/', StudentView.as_view(), name='estudiante-detail'),
    # CRUD TUTORES
    path('tutores/', TutorView.as_view(), name='tutores'),
    path('tutores/<int:pk>/', TutorView.as_view(), name='tutor-detail'),
    # CRUD COORDINADORES
    path('coordinadores/', CoordinatorView.as_view(), name='coordinadores'),
    path('coordinadores/<int:pk>/', CoordinatorView.as_view(), name='coordinador-detail'),
]