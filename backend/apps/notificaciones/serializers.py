from rest_framework import serializers

from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    # El frontend lee "fecha" y no depende del nombre del campo de auditoría.
    fecha = serializers.DateTimeField(source='date_creation', read_only=True)

    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'titulo', 'mensaje', 'tutoria', 'leida', 'fecha']
        read_only_fields = ['id', 'tipo', 'titulo', 'mensaje', 'tutoria', 'fecha']

    def validate(self, attrs):
        """El PATCH solo marca como leída: {"leida": true}."""
        if attrs.get('leida') is not True:
            raise serializers.ValidationError({'leida': 'Solo se puede marcar como leída: envía {"leida": true}.'})
        return attrs
