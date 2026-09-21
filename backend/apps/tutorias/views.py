from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.tutorias.serializers import TutoriaRegisterSerializer

class TutoRegisterView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        serializer = TutoriaRegisterSerializer(
            data = request.data,
            context={'request': request}
        )

        serializer.is_valid(raise_exception=True)
        tutoria = serializer.save()

        return Response({
            'message': 'La tutoría fue reservada correctamente.',
            'tutoria': {
                'id': tutoria.id,
                'codigo': tutoria.codigo,
                'bloque': tutoria.bloque_id,
                'estudiante': tutoria.estudiante_id,
                'tema': tutoria.tema,
                'descripcion': tutoria.descripcion,
                'estado': tutoria.estado,
            }
        }, status=status.HTTP_201_CREATED)