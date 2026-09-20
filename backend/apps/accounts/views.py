from rest_framework import status, views
from rest_framework.response import Response
from .serializers import LoginSerializers

class LoginView(views.APIView):
    def post(self, request, format=None):
        serializer = LoginSerializers(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response({
            'access': serializer.validated_data['access'],
            'refresh': serializer.validated_data['refresh'],
            'groups': list(user.groups.values_list('id', 'name')),
        }, status=status.HTTP_200_OK)

    