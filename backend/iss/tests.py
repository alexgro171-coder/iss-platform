"""
Suite de teste unitare pentru aplicația ISS Platform.
Testează modelele, serializerele, view-urile și permisiunile.
"""

from decimal import Decimal
from datetime import date, datetime

from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import Client, Worker, UserProfile, UserRole, WorkerStatus


# =============================================================================
# TESTE PENTRU AUTENTIFICARE JWT
# =============================================================================


class JWTAuthenticationTest(APITestCase):
    """Teste pentru autentificarea JWT."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="jwt_test_user",
            password="testpass123",
            email="jwt@test.com"
        )
        UserProfile.objects.create(
            user=self.user,
            role=UserRole.EXPERT,
            telefon="+40721999999"
        )

    def test_obtain_token_with_valid_credentials(self):
        """Obține token JWT cu credențiale valide."""
        response = self.client.post('/api/token/', {
            'username': 'jwt_test_user',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_obtain_token_with_invalid_credentials(self):
        """Nu poate obține token cu credențiale invalide."""
        response = self.client.post('/api/token/', {
            'username': 'jwt_test_user',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_api_with_valid_token(self):
        """Poate accesa API-ul cu un token valid."""
        # Obținem token
        token_response = self.client.post('/api/token/', {
            'username': 'jwt_test_user',
            'password': 'testpass123'
        })
        access_token = token_response.data['access']
        
        # Accesăm API-ul
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_access_api_without_token(self):
        """Nu poate accesa API-ul fără token."""
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_api_with_invalid_token(self):
        """Nu poate accesa API-ul cu un token invalid."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_here')
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token(self):
        """Poate reîmprospăta token-ul de acces."""
        # Obținem token-uri
        token_response = self.client.post('/api/token/', {
            'username': 'jwt_test_user',
            'password': 'testpass123'
        })
        refresh_token = token_response.data['refresh']
        
        # Reîmprospătăm
        refresh_response = self.client.post('/api/token/refresh/', {
            'refresh': refresh_token
        })
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)

    def test_verify_valid_token(self):
        """Poate verifica un token valid."""
        # Obținem token
        token_response = self.client.post('/api/token/', {
            'username': 'jwt_test_user',
            'password': 'testpass123'
        })
        access_token = token_response.data['access']
        
        # Verificăm
        verify_response = self.client.post('/api/token/verify/', {
            'token': access_token
        })
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

    def test_current_user_endpoint(self):
        """Endpoint-ul /api/me/ returnează informațiile utilizatorului."""
        # Obținem token
        token_response = self.client.post('/api/token/', {
            'username': 'jwt_test_user',
            'password': 'testpass123'
        })
        access_token = token_response.data['access']
        
        # Accesăm /api/me/
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'jwt_test_user')
        self.assertEqual(response.data['email'], 'jwt@test.com')
        self.assertEqual(response.data['role'], 'Expert')
        self.assertEqual(response.data['telefon'], '+40721999999')

    def test_current_user_endpoint_without_auth(self):
        """Endpoint-ul /api/me/ necesită autentificare."""
        response = self.client.get('/api/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# =============================================================================
# TESTE PENTRU MODELE
# =============================================================================


class UserProfileModelTest(TestCase):
    """Teste pentru modelul UserProfile și roluri."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="test_agent",
            email="agent@test.com",
            password="testpass123"
        )

    def test_create_user_profile_with_default_role(self):
        """Profilul creat implicit are rol Agent."""
        profile = UserProfile.objects.create(user=self.user)
        self.assertEqual(profile.role, UserRole.AGENT)

    def test_create_user_profile_with_expert_role(self):
        """Profilul poate fi creat cu rol Expert."""
        profile = UserProfile.objects.create(user=self.user, role=UserRole.EXPERT)
        self.assertEqual(profile.role, UserRole.EXPERT)

    def test_create_user_profile_with_management_role(self):
        """Profilul poate fi creat cu rol Management."""
        profile = UserProfile.objects.create(user=self.user, role=UserRole.MANAGEMENT)
        self.assertEqual(profile.role, UserRole.MANAGEMENT)

    def test_create_user_profile_with_admin_role(self):
        """Profilul poate fi creat cu rol Admin."""
        profile = UserProfile.objects.create(user=self.user, role=UserRole.ADMIN)
        self.assertEqual(profile.role, UserRole.ADMIN)

    def test_user_profile_str_representation(self):
        """Verifică reprezentarea string a profilului."""
        profile = UserProfile.objects.create(user=self.user, role=UserRole.EXPERT)
        self.assertEqual(str(profile), "test_agent (Expert)")

    def test_all_user_roles_exist(self):
        """Verifică că toate cele 4 roluri din specificații există."""
        expected_roles = ["Agent", "Expert", "Management", "Admin"]
        actual_roles = [choice[0] for choice in UserRole.choices]
        self.assertEqual(actual_roles, expected_roles)

    def test_user_profile_with_telefon(self):
        """Verifică că câmpul telefon funcționează corect."""
        profile = UserProfile.objects.create(
            user=self.user,
            role=UserRole.AGENT,
            telefon="+40721123456"
        )
        self.assertEqual(profile.telefon, "+40721123456")

    def test_user_profile_telefon_can_be_empty(self):
        """Verifică că telefonul poate fi gol (opțional)."""
        profile = UserProfile.objects.create(user=self.user)
        self.assertEqual(profile.telefon, "")


class ClientModelTest(TestCase):
    """Teste pentru modelul Client (Tabelul Clienti din specificații)."""

    def test_create_client_with_all_fields(self):
        """Creează un client cu toate câmpurile conform specificațiilor."""
        client = Client.objects.create(
            denumire="Test Company SRL",
            tara="Romania",
            oras="București",
            judet="Ilfov",
            adresa="Str. Test nr. 10",
            cod_fiscal="RO12345678",
            tarif_orar=Decimal("25.50"),
            nr_ore_minim=160,
            cazare_cost=Decimal("500.00"),
            masa_cost=Decimal("300.00"),
            transport_cost=Decimal("200.00"),
        )
        self.assertEqual(client.denumire, "Test Company SRL")
        self.assertEqual(client.tarif_orar, Decimal("25.50"))
        self.assertEqual(client.nr_ore_minim, 160)

    def test_client_str_representation(self):
        """Verifică reprezentarea string a clientului."""
        client = Client.objects.create(denumire="ABC Corp")
        self.assertEqual(str(client), "ABC Corp")

    def test_client_fields_match_specification(self):
        """Verifică că toate câmpurile din specificații există."""
        required_fields = [
            'denumire', 'tara', 'oras', 'judet', 'adresa', 'cod_fiscal',
            'tarif_orar', 'nr_ore_minim', 'cazare_cost', 'masa_cost', 'transport_cost'
        ]
        model_fields = [f.name for f in Client._meta.get_fields() if f.name != 'id' and f.name != 'workers']
        for field in required_fields:
            self.assertIn(field, model_fields, f"Câmpul '{field}' lipsește din modelul Client")

    def test_client_decimal_precision(self):
        """Verifică precizia câmpurilor Decimal (10,2)."""
        client = Client.objects.create(
            denumire="Test",
            tarif_orar=Decimal("12345678.99"),
            cazare_cost=Decimal("12345678.99"),
            masa_cost=Decimal("12345678.99"),
            transport_cost=Decimal("12345678.99"),
        )
        self.assertEqual(client.tarif_orar, Decimal("12345678.99"))


class WorkerModelTest(TestCase):
    """Teste pentru modelul Worker (Tabelul Lucratori din specificații)."""

    def setUp(self):
        self.user = User.objects.create_user(username="agent1", password="pass123")
        self.client = Client.objects.create(denumire="Test Client")

    def test_create_worker_with_minimal_fields(self):
        """Creează un lucrător cu câmpurile minime obligatorii."""
        worker = Worker.objects.create(
            nume="Popescu",
            prenume="Ion",
            pasaport_nr="AB123456",
        )
        self.assertEqual(worker.nume, "Popescu")
        self.assertEqual(worker.pasaport_nr, "AB123456")

    def test_create_worker_with_all_fields(self):
        """Creează un lucrător cu toate câmpurile conform specificațiilor."""
        worker = Worker.objects.create(
            nume="Popescu",
            prenume="Ion",
            cetatenie="Ucraina",
            stare_civila="M",
            copii_intretinere=2,
            sex="M",
            data_nasterii=date(1990, 5, 15),
            pasaport_nr="AB123456",
            data_emitere_pass=date(2020, 1, 1),
            data_exp_pass=date(2030, 1, 1),
            oras_domiciliu="Kiev",
            cod_cor="721410",
            agent=self.user,
            dosar_wp_nr="WP2024/001",
            data_solicitare_wp=date(2024, 1, 15),
            data_programare_wp=date(2024, 2, 1),
            judet_wp="București",
            data_solicitare_viza=date(2024, 3, 1),
            data_programare_interviu=date(2024, 3, 15),
            status=WorkerStatus.AVIZ_SOLICITAT,
            data_depunere_ps=date(2024, 6, 1),
            data_programare_ps=date(2024, 6, 15),
            cnp="1900515123456",
            data_intrare_ro=date(2024, 5, 1),
            cim_nr="CIM2024/001",
            data_emitere_cim=date(2024, 5, 2),
            data_emitere_ps=date(2024, 6, 20),
            data_expirare_ps=date(2025, 6, 20),
            adresa_ro="Str. Test nr. 5, București",
            client=self.client,
            observatii="Note de test",
            folder_doc="/docs/workers/AB123456/",
        )
        self.assertEqual(worker.cetatenie, "Ucraina")
        self.assertEqual(worker.copii_intretinere, 2)
        self.assertEqual(worker.agent, self.user)
        self.assertEqual(worker.client, self.client)

    def test_worker_str_representation(self):
        """Verifică reprezentarea string a lucrătorului."""
        worker = Worker.objects.create(
            nume="Popescu",
            prenume="Ion",
            pasaport_nr="AB123456",
        )
        self.assertEqual(str(worker), "Popescu Ion (AB123456)")

    def test_worker_pasaport_nr_unique(self):
        """Verifică că numărul de pașaport este unic."""
        Worker.objects.create(nume="Test1", prenume="User1", pasaport_nr="UNIQUE123")
        with self.assertRaises(Exception):
            Worker.objects.create(nume="Test2", prenume="User2", pasaport_nr="UNIQUE123")

    def test_worker_default_status(self):
        """Verifică statusul implicit (Aviz solicitat)."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="Worker",
            pasaport_nr="DEFAULT001",
        )
        self.assertEqual(worker.status, WorkerStatus.AVIZ_SOLICITAT)

    def test_all_worker_statuses_exist(self):
        """Verifică că toate statusurile din specificații există."""
        expected_statuses = [
            "Aviz solicitat",
            "Aviz emis",
            "Viza solicitata",
            "Viza obtinuta",
            "Viza respinsa",
            "Viza redepusa",
            "Candidat retras",
            "Sosit cu CIM semnat",
            "Permis de sedere solicitat",
            "Permis de sedere emis",
            "Activ",
            "Suspendat",
            "Inactiv",
        ]
        actual_statuses = [choice[0] for choice in WorkerStatus.choices]
        self.assertEqual(actual_statuses, expected_statuses)

    def test_worker_stare_civila_choices(self):
        """Verifică opțiunile pentru stare civilă (M/NM)."""
        # Măritat
        worker1 = Worker.objects.create(
            nume="Test1", prenume="User1", pasaport_nr="SC001", stare_civila="M"
        )
        self.assertEqual(worker1.stare_civila, "M")
        
        # Nemăritat
        worker2 = Worker.objects.create(
            nume="Test2", prenume="User2", pasaport_nr="SC002", stare_civila="NM"
        )
        self.assertEqual(worker2.stare_civila, "NM")

    def test_worker_sex_choices(self):
        """Verifică opțiunile pentru sex (M/F)."""
        worker_m = Worker.objects.create(
            nume="Test", prenume="Male", pasaport_nr="SEX001", sex="M"
        )
        self.assertEqual(worker_m.sex, "M")
        
        worker_f = Worker.objects.create(
            nume="Test", prenume="Female", pasaport_nr="SEX002", sex="F"
        )
        self.assertEqual(worker_f.sex, "F")

    def test_worker_fields_match_specification(self):
        """Verifică că toate câmpurile din specificații există."""
        required_fields = [
            'nume', 'prenume', 'cetatenie', 'stare_civila', 'copii_intretinere',
            'sex', 'data_nasterii', 'pasaport_nr', 'data_emitere_pass', 'data_exp_pass',
            'oras_domiciliu', 'data_introducere', 'cod_cor', 'agent',
            'dosar_wp_nr', 'data_solicitare_wp', 'data_programare_wp', 'judet_wp',
            'data_solicitare_viza', 'data_programare_interviu', 'status',
            'data_depunere_ps', 'data_programare_ps', 'cnp', 'data_intrare_ro',
            'cim_nr', 'data_emitere_cim', 'data_emitere_ps', 'data_expirare_ps',
            'adresa_ro', 'client', 'observatii', 'folder_doc'
        ]
        model_fields = [f.name for f in Worker._meta.get_fields() if f.name != 'id']
        for field in required_fields:
            self.assertIn(field, model_fields, f"Câmpul '{field}' lipsește din modelul Worker")

    def test_worker_data_introducere_auto_set(self):
        """Verifică că data_introducere este setată automat."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="Auto",
            pasaport_nr="AUTO001",
        )
        self.assertIsNotNone(worker.data_introducere)

    def test_worker_foreign_key_agent(self):
        """Verifică relația FK cu User (agent)."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="FK",
            pasaport_nr="FK001",
            agent=self.user,
        )
        self.assertEqual(worker.agent.username, "agent1")

    def test_worker_foreign_key_client(self):
        """Verifică relația FK cu Client."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="FK",
            pasaport_nr="FK002",
            client=self.client,
        )
        self.assertEqual(worker.client.denumire, "Test Client")

    def test_worker_cascade_behavior_agent_deleted(self):
        """Verifică comportamentul la ștergerea agentului (SET_NULL)."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="Cascade",
            pasaport_nr="CASCADE001",
            agent=self.user,
        )
        self.user.delete()
        worker.refresh_from_db()
        self.assertIsNone(worker.agent)

    def test_worker_cascade_behavior_client_deleted(self):
        """Verifică comportamentul la ștergerea clientului (SET_NULL)."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="Cascade",
            pasaport_nr="CASCADE002",
            client=self.client,
        )
        self.client.delete()
        worker.refresh_from_db()
        self.assertIsNone(worker.client)


# =============================================================================
# TESTE PENTRU SERIALIZERE
# =============================================================================


class ClientSerializerTest(TestCase):
    """Teste pentru ClientSerializer."""

    def test_serialize_client(self):
        """Verifică serializarea completă a unui client."""
        from .serializers import ClientSerializer
        
        client = Client.objects.create(
            denumire="Test SRL",
            tara="Romania",
            tarif_orar=Decimal("20.00"),
        )
        serializer = ClientSerializer(client)
        data = serializer.data
        
        self.assertEqual(data['denumire'], "Test SRL")
        self.assertEqual(data['tara'], "Romania")
        self.assertEqual(Decimal(data['tarif_orar']), Decimal("20.00"))

    def test_deserialize_client(self):
        """Verifică deserializarea și crearea unui client."""
        from .serializers import ClientSerializer
        
        data = {
            'denumire': 'New Client',
            'tara': 'Germany',
            'oras': 'Berlin',
            'tarif_orar': '30.00',
        }
        serializer = ClientSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        client = serializer.save()
        self.assertEqual(client.denumire, 'New Client')


class WorkerSerializerTest(TestCase):
    """Teste pentru WorkerSerializer."""

    def setUp(self):
        self.client = Client.objects.create(denumire="Test Client")

    def test_serialize_worker(self):
        """Verifică serializarea completă a unui lucrător."""
        from .serializers import WorkerSerializer
        
        worker = Worker.objects.create(
            nume="Test",
            prenume="Worker",
            pasaport_nr="SER001",
            client=self.client,
        )
        serializer = WorkerSerializer(worker)
        data = serializer.data
        
        self.assertEqual(data['nume'], "Test")
        self.assertEqual(data['prenume'], "Worker")
        self.assertEqual(data['client_denumire'], "Test Client")

    def test_worker_serializer_includes_client_denumire(self):
        """Verifică că serializerul include denumirea clientului."""
        from .serializers import WorkerSerializer
        
        worker = Worker.objects.create(
            nume="Test",
            prenume="Worker",
            pasaport_nr="SER002",
            client=self.client,
        )
        serializer = WorkerSerializer(worker)
        self.assertIn('client_denumire', serializer.data)

    def test_data_introducere_is_read_only(self):
        """Verifică că data_introducere este read-only."""
        from .serializers import WorkerSerializer
        
        serializer = WorkerSerializer()
        self.assertIn('data_introducere', serializer.Meta.read_only_fields)


# =============================================================================
# TESTE PENTRU API / VIEWS
# =============================================================================


class ClientAPITest(APITestCase):
    """Teste pentru API-ul de clienți."""

    def setUp(self):
        # Crează utilizatori cu diferite roluri
        self.admin_user = User.objects.create_user(username="admin", password="admin123")
        UserProfile.objects.create(user=self.admin_user, role=UserRole.ADMIN)
        
        self.management_user = User.objects.create_user(username="manager", password="manager123")
        UserProfile.objects.create(user=self.management_user, role=UserRole.MANAGEMENT)
        
        self.expert_user = User.objects.create_user(username="expert", password="expert123")
        UserProfile.objects.create(user=self.expert_user, role=UserRole.EXPERT)
        
        self.agent_user = User.objects.create_user(username="agent", password="agent123")
        UserProfile.objects.create(user=self.agent_user, role=UserRole.AGENT)
        
        self.client_obj = Client.objects.create(
            denumire="Test Client API",
            tara="Romania",
        )

    def test_list_clients_authenticated(self):
        """Utilizatorii autentificați pot lista clienții."""
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.get('/api/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_clients_unauthenticated(self):
        """Utilizatorii neautentificați nu pot accesa API-ul."""
        response = self.client.get('/api/clients/')
        # Cu JWT, răspunsul este 401 Unauthorized (nu 403 Forbidden)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_client_as_management(self):
        """Management poate crea clienți."""
        self.client.force_authenticate(user=self.management_user)
        data = {'denumire': 'New Client', 'tara': 'Germany'}
        response = self.client.post('/api/clients/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_client_as_admin(self):
        """Admin poate crea clienți."""
        self.client.force_authenticate(user=self.admin_user)
        data = {'denumire': 'Admin Client', 'tara': 'France'}
        response = self.client.post('/api/clients/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_client_as_expert_forbidden(self):
        """Expert NU poate crea clienți."""
        self.client.force_authenticate(user=self.expert_user)
        data = {'denumire': 'Expert Client', 'tara': 'Italy'}
        response = self.client.post('/api/clients/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_client_as_agent_forbidden(self):
        """Agent NU poate crea clienți."""
        self.client.force_authenticate(user=self.agent_user)
        data = {'denumire': 'Agent Client', 'tara': 'Spain'}
        response = self.client.post('/api/clients/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_client_as_management(self):
        """Management poate actualiza clienți."""
        self.client.force_authenticate(user=self.management_user)
        data = {'denumire': 'Updated Client', 'tara': 'Romania'}
        response = self.client.put(f'/api/clients/{self.client_obj.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_client_as_admin(self):
        """Admin poate șterge clienți."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/clients/{self.client_obj.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class WorkerAPITest(APITestCase):
    """Teste pentru API-ul de lucrători."""

    def setUp(self):
        # Utilizatori
        self.admin_user = User.objects.create_user(username="admin", password="admin123")
        UserProfile.objects.create(user=self.admin_user, role=UserRole.ADMIN)
        
        self.management_user = User.objects.create_user(username="manager", password="manager123")
        UserProfile.objects.create(user=self.management_user, role=UserRole.MANAGEMENT)
        
        self.expert_user = User.objects.create_user(username="expert", password="expert123")
        UserProfile.objects.create(user=self.expert_user, role=UserRole.EXPERT)
        
        self.agent_user = User.objects.create_user(username="agent", password="agent123")
        UserProfile.objects.create(user=self.agent_user, role=UserRole.AGENT)
        
        self.agent_user2 = User.objects.create_user(username="agent2", password="agent123")
        UserProfile.objects.create(user=self.agent_user2, role=UserRole.AGENT)
        
        # Client
        self.client_obj = Client.objects.create(denumire="Test Client")
        
        # Workers
        self.worker_agent1 = Worker.objects.create(
            nume="Worker",
            prenume="Agent1",
            pasaport_nr="AGENT1001",
            agent=self.agent_user,
            cetatenie="Ucraina",
            status=WorkerStatus.AVIZ_SOLICITAT,
        )
        
        self.worker_agent2 = Worker.objects.create(
            nume="Worker",
            prenume="Agent2",
            pasaport_nr="AGENT2001",
            agent=self.agent_user2,
            cetatenie="Moldova",
            status=WorkerStatus.VIZA_OBTINUTA,
        )

    def test_agent_sees_only_own_workers(self):
        """Agentul vede doar lucrătorii proprii."""
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['pasaport_nr'], 'AGENT1001')

    def test_expert_sees_all_workers(self):
        """Expertul vede toți lucrătorii."""
        self.client.force_authenticate(user=self.expert_user)
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_management_sees_all_workers(self):
        """Management vede toți lucrătorii."""
        self.client.force_authenticate(user=self.management_user)
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_sees_all_workers(self):
        """Admin vede toți lucrătorii."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/workers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_by_status(self):
        """Filtrare după status."""
        self.client.force_authenticate(user=self.expert_user)
        response = self.client.get('/api/workers/', {'status': 'Aviz solicitat'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['pasaport_nr'], 'AGENT1001')

    def test_filter_by_pasaport_nr(self):
        """Filtrare după număr pașaport (partial match)."""
        self.client.force_authenticate(user=self.expert_user)
        response = self.client.get('/api/workers/', {'pasaport_nr': 'AGENT1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_cetatenie(self):
        """Filtrare după cetățenie."""
        self.client.force_authenticate(user=self.expert_user)
        response = self.client.get('/api/workers/', {'cetatenie': 'Ucraina'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['cetatenie'], 'Ucraina')

    def test_filter_by_client_id(self):
        """Filtrare după client_id."""
        # Atribuie un client
        self.worker_agent1.client = self.client_obj
        self.worker_agent1.save()
        
        self.client.force_authenticate(user=self.expert_user)
        response = self.client.get('/api/workers/', {'client_id': self.client_obj.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_date_range(self):
        """Filtrare după interval de date."""
        self.client.force_authenticate(user=self.expert_user)
        today = date.today().isoformat()
        response = self.client.get('/api/workers/', {'data_start': today, 'data_end': today})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_cod_cor(self):
        """Filtrare după cod COR (cod ocupațional)."""
        # Setăm cod COR pentru un worker
        self.worker_agent1.cod_cor = "721410"  # Sudor
        self.worker_agent1.save()
        
        self.worker_agent2.cod_cor = "311101"  # Tehnician
        self.worker_agent2.save()
        
        self.client.force_authenticate(user=self.expert_user)
        
        # Căutare exactă
        response = self.client.get('/api/workers/', {'cod_cor': '721410'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['cod_cor'], '721410')

    def test_filter_by_cod_cor_partial(self):
        """Filtrare parțială după cod COR (primele cifre)."""
        self.worker_agent1.cod_cor = "721410"
        self.worker_agent1.save()
        
        self.worker_agent2.cod_cor = "721420"
        self.worker_agent2.save()
        
        self.client.force_authenticate(user=self.expert_user)
        
        # Căutare parțială - toate codurile care conțin "7214"
        response = self.client.get('/api/workers/', {'cod_cor': '7214'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_by_judet_wp(self):
        """Filtrare după județ WP (Work Permit)."""
        self.worker_agent1.judet_wp = "București"
        self.worker_agent1.save()
        
        self.worker_agent2.judet_wp = "Cluj"
        self.worker_agent2.save()
        
        self.client.force_authenticate(user=self.expert_user)
        
        response = self.client.get('/api/workers/', {'judet_wp': 'București'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['judet_wp'], 'București')

    def test_filter_by_judet_wp_case_insensitive(self):
        """Filtrare după județ WP ignoră majusculele."""
        self.worker_agent1.judet_wp = "București"
        self.worker_agent1.save()
        
        self.client.force_authenticate(user=self.expert_user)
        
        # Căutare cu litere mici
        response = self.client.get('/api/workers/', {'judet_wp': 'bucurești'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_worker(self):
        """Creare lucrător nou."""
        self.client.force_authenticate(user=self.expert_user)
        data = {
            'nume': 'New',
            'prenume': 'Worker',
            'pasaport_nr': 'NEW001',
            'cetatenie': 'India',
        }
        response = self.client.post('/api/workers/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_access_forbidden(self):
        """Accesul neautentificat este interzis."""
        response = self.client.get('/api/workers/')
        # Cu JWT, răspunsul este 401 Unauthorized (nu 403 Forbidden)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ==================== TESTE PENTRU RESTRICȚIA DE ȘTERGERE ====================

    def test_agent_cannot_delete_worker(self):
        """Agentul NU poate șterge lucrători - conform specificațiilor."""
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.delete(f'/api/workers/{self.worker_agent1.id}/')
        # Trebuie să primească 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Verificăm că lucrătorul încă există în baza de date
        self.assertTrue(Worker.objects.filter(id=self.worker_agent1.id).exists())

    def test_expert_can_delete_worker(self):
        """Expertul POATE șterge lucrători."""
        self.client.force_authenticate(user=self.expert_user)
        response = self.client.delete(f'/api/workers/{self.worker_agent1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Verificăm că lucrătorul a fost șters
        self.assertFalse(Worker.objects.filter(id=self.worker_agent1.id).exists())

    def test_management_can_delete_worker(self):
        """Management POATE șterge lucrători."""
        self.client.force_authenticate(user=self.management_user)
        response = self.client.delete(f'/api/workers/{self.worker_agent2.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_delete_worker(self):
        """Admin POATE șterge lucrători."""
        # Creăm un worker nou pentru a-l șterge
        worker = Worker.objects.create(
            nume="ToDelete", prenume="Test", pasaport_nr="DEL001"
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/workers/{worker.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_agent_can_still_create_worker(self):
        """Agentul POATE crea lucrători (doar ștergerea e interzisă)."""
        self.client.force_authenticate(user=self.agent_user)
        data = {
            'nume': 'New',
            'prenume': 'Worker',
            'pasaport_nr': 'NEWAGENT001',
        }
        response = self.client.post('/api/workers/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_agent_can_still_update_worker(self):
        """Agentul POATE actualiza lucrători (doar ștergerea e interzisă)."""
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.patch(
            f'/api/workers/{self.worker_agent1.id}/',
            {'observatii': 'Updated by agent'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# =============================================================================
# TESTE PENTRU PERMISIUNI (RBAC)
# =============================================================================


class RBACPermissionsTest(APITestCase):
    """Teste pentru sistemul de permisiuni RBAC."""

    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="pass")
        UserProfile.objects.create(user=self.admin, role=UserRole.ADMIN)
        
        self.management = User.objects.create_user(username="management", password="pass")
        UserProfile.objects.create(user=self.management, role=UserRole.MANAGEMENT)
        
        self.expert = User.objects.create_user(username="expert", password="pass")
        UserProfile.objects.create(user=self.expert, role=UserRole.EXPERT)
        
        self.agent = User.objects.create_user(username="agent", password="pass")
        UserProfile.objects.create(user=self.agent, role=UserRole.AGENT)

    def test_admin_has_full_client_access(self):
        """Admin are acces complet la clienți."""
        self.client.force_authenticate(user=self.admin)
        
        # Create
        response = self.client.post('/api/clients/', {'denumire': 'Test'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        client_id = response.data['id']
        
        # Read
        response = self.client.get(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update
        response = self.client.patch(f'/api/clients/{client_id}/', {'denumire': 'Updated'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Delete
        response = self.client.delete(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_management_has_full_client_access(self):
        """Management are acces complet la clienți."""
        self.client.force_authenticate(user=self.management)
        
        # Create
        response = self.client.post('/api/clients/', {'denumire': 'Test'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        client_id = response.data['id']
        
        # Read
        response = self.client.get(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update
        response = self.client.patch(f'/api/clients/{client_id}/', {'denumire': 'Updated'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Delete
        response = self.client.delete(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_expert_read_only_client_access(self):
        """Expert are doar acces read la clienți."""
        # Creează un client ca admin
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/clients/', {'denumire': 'Test'})
        client_id = response.data['id']
        
        # Expert încearcă operațiuni
        self.client.force_authenticate(user=self.expert)
        
        # Read - OK
        response = self.client.get(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Create - FORBIDDEN
        response = self.client.post('/api/clients/', {'denumire': 'New'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Update - FORBIDDEN
        response = self.client.patch(f'/api/clients/{client_id}/', {'denumire': 'Updated'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Delete - FORBIDDEN
        response = self.client.delete(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_agent_read_only_client_access(self):
        """Agent are doar acces read la clienți."""
        # Creează un client ca admin
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/clients/', {'denumire': 'Test'})
        client_id = response.data['id']
        
        # Agent încearcă operațiuni
        self.client.force_authenticate(user=self.agent)
        
        # Read - OK
        response = self.client.get(f'/api/clients/{client_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Create - FORBIDDEN
        response = self.client.post('/api/clients/', {'denumire': 'New'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# =============================================================================
# TESTE DE INTEGRITATE DATE
# =============================================================================


class DataIntegrityTest(TestCase):
    """Teste pentru integritatea datelor."""

    def test_worker_cnp_max_length(self):
        """CNP are maximum 13 caractere."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="CNP",
            pasaport_nr="CNP001",
            cnp="1234567890123",  # 13 caractere
        )
        self.assertEqual(len(worker.cnp), 13)

    def test_worker_pasaport_max_length(self):
        """Pașaportul are maximum 20 caractere."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="Pass",
            pasaport_nr="12345678901234567890",  # 20 caractere
        )
        self.assertEqual(len(worker.pasaport_nr), 20)

    def test_client_cod_fiscal_max_length(self):
        """Codul fiscal are maximum 50 caractere."""
        client = Client.objects.create(
            denumire="Test",
            cod_fiscal="RO" + "1" * 48,  # 50 caractere
        )
        self.assertEqual(len(client.cod_fiscal), 50)


# =============================================================================
# TESTE PENTRU VALIDĂRI BUSINESS
# =============================================================================


class BusinessLogicTest(TestCase):
    """Teste pentru logica de business."""

    def test_worker_status_workflow(self):
        """Verifică că toate tranzițiile de status sunt posibile."""
        worker = Worker.objects.create(
            nume="Test",
            prenume="Workflow",
            pasaport_nr="WF001",
            status=WorkerStatus.AVIZ_SOLICITAT,
        )
        
        # Simulează fluxul complet
        statuses = [
            WorkerStatus.AVIZ_EMIS,
            WorkerStatus.VIZA_SOLICITATA,
            WorkerStatus.VIZA_OBTINUTA,
            WorkerStatus.SOSIT_CU_CIM,
            WorkerStatus.PS_SOLICITAT,
            WorkerStatus.PS_EMIS,
            WorkerStatus.ACTIV,
        ]
        
        for new_status in statuses:
            worker.status = new_status
            worker.save()
            worker.refresh_from_db()
            self.assertEqual(worker.status, new_status)

    def test_agent_worker_relationship(self):
        """Verifică relația agent-lucrători (1:N)."""
        agent = User.objects.create_user(username="agent_rel", password="pass")
        
        worker1 = Worker.objects.create(
            nume="W1", prenume="Test", pasaport_nr="REL001", agent=agent
        )
        worker2 = Worker.objects.create(
            nume="W2", prenume="Test", pasaport_nr="REL002", agent=agent
        )
        worker3 = Worker.objects.create(
            nume="W3", prenume="Test", pasaport_nr="REL003", agent=agent
        )
        
        # Verifică că agentul are 3 lucrători
        self.assertEqual(agent.workers_introdusi.count(), 3)

    def test_client_workers_relationship(self):
        """Verifică relația client-lucrători (1:N)."""
        client = Client.objects.create(denumire="Test Client Rel")
        
        worker1 = Worker.objects.create(
            nume="W1", prenume="Test", pasaport_nr="CREL001", client=client
        )
        worker2 = Worker.objects.create(
            nume="W2", prenume="Test", pasaport_nr="CREL002", client=client
        )
        
        # Verifică că clientul are 2 lucrători
        self.assertEqual(client.workers.count(), 2)
