from django.urls import path

from .views import (
    MarcarTodasView,
    NotificacionDetailView,
    NotificacionListView,
    NotificacionResumenView,
)

urlpatterns = [
    path('', NotificacionListView.as_view(), name='notificaciones'),
    path('resumen/', NotificacionResumenView.as_view(), name='notificaciones-resumen'),
    path('marcar-todas/', MarcarTodasView.as_view(), name='notificaciones-marcar-todas'),
    path('<int:pk>/', NotificacionDetailView.as_view(), name='notificacion-detalle'),
]
