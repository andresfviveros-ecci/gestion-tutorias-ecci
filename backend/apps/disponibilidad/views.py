from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import BloqueDisponibilidadSerializer

class BloqueDisponibilidadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self,request,format=None):
        serializer = BloqueDisponibilidadSerializer(data = request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(docente=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
