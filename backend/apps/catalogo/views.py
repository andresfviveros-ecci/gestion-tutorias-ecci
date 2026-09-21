from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Materia
from .serializer import *

class MateriaView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        materias = Materia.objects.all()
        serializer = MateriaSerializer(materias, many=True)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    
    def post(self, request, format=None):
        serializer = MateriaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        materia = serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

class MateriaDetailView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get_materia(self, pk):
        try:
            return Materia.objects.get(id=pk)
        except Materia.DoesNotExist:
            return None
    def get(self, request, pk, format=None):
        materia = self.get_materia(pk)
        if materia is None:
            return Response(
                {'error': 'La materia no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = MateriaSerializer(materia)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def put(self, request, pk, format=None):
        materia = self.get_materia(pk)
        if materia is None:
            return Response(
                {'error': 'La materia no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = MateriaSerializer(
            materia,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        materia = serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    def delete(self, request, pk, format=None):
        materia = self.get_materia(pk)
        if materia is None:
            return Response(
                {'error': 'La materia no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        materia.delete()
        return Response(
            {'message': 'La materia fue eliminada correctamente.'},
            status=status.HTTP_204_NO_CONTENT
        )