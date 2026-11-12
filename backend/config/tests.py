from django.test import TestCase, override_settings


class SaludTests(TestCase):
    def test_responde_ok_sin_sesion(self):
        response = self.client.get('/api/salud/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'estado': 'ok'})

    @override_settings(ALLOWED_HOSTS=['api.ejemplo.com', 'healthcheck.railway.app'])
    def test_acepta_el_host_del_healthcheck_de_railway(self):
        response = self.client.get('/api/salud/', HTTP_HOST='healthcheck.railway.app')
        self.assertEqual(response.status_code, 200)
