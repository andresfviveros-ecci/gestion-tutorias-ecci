from django.urls import path

from .views import ReporteTutoresView

urlpatterns = [
    path('tutores/', ReporteTutoresView.as_view(), name='reporte-tutores'),
]
