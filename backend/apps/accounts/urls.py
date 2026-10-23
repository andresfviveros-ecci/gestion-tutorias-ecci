from django.urls import path
from .views import ChangePasswordView, LoginView,RecoveryTokenView,StudentView,StudentDetailView,TutorView,TutorDetailView,CoordinatorView,CoordinatorDetailView

urlpatterns = [
    # AUTENTICACIÓN
    path('login/', LoginView.as_view(), name='login'),
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
]