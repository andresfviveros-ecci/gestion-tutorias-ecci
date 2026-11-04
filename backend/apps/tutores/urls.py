from django.urls import path

from .views import (
    AprobarView,
    RechazarView,
    RevocarView,
    SolicitudTutorDetailView,
    SolicitudTutorView,
)

urlpatterns = [
    path('solicitudes/', SolicitudTutorView.as_view(), name='solicitudes-tutor'),
    path('solicitudes/<int:pk>/', SolicitudTutorDetailView.as_view(), name='solicitud-tutor-detalle'),
    path('solicitudes/<int:pk>/aprobar/', AprobarView.as_view(), name='solicitud-tutor-aprobar'),
    path('solicitudes/<int:pk>/rechazar/', RechazarView.as_view(), name='solicitud-tutor-rechazar'),
    path('solicitudes/<int:pk>/revocar/', RevocarView.as_view(), name='solicitud-tutor-revocar'),
]
