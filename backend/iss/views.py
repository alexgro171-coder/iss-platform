from django.utils.dateparse import parse_date
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Client, Worker, UserProfile, UserRole
from .serializers import ClientSerializer, WorkerSerializer, CurrentUserSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    """
    Returnează informațiile utilizatorului curent.
    Endpoint: GET /api/me/
    
    Folosit de frontend pentru a afișa datele utilizatorului logat.
    """
    serializer = CurrentUserSerializer(request.user)
    return Response(serializer.data)


class IsManagementOrReadOnly(permissions.BasePermission):
    """
    Permite full access Management/Admin.
    Ceilalți pot doar citi (GET).
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        try:
            role = request.user.profile.role
        except UserProfile.DoesNotExist:
            role = None

        return role in (UserRole.MANAGEMENT, UserRole.ADMIN)


class AgentCannotDelete(permissions.BasePermission):
    """
    Interzice ștergerea (DELETE) pentru utilizatorii cu rol Agent.
    
    Conform specificațiilor:
    - Agent: "Nu poate șterge înregistrări"
    
    Permite toate celelalte operațiuni (GET, POST, PUT, PATCH).
    """

    def has_permission(self, request, view):
        # Utilizatorul trebuie să fie autentificat
        if not request.user.is_authenticated:
            return False

        # Dacă NU este o cerere DELETE, permitem
        if request.method != "DELETE":
            return True

        # Este DELETE - verificăm rolul
        try:
            role = request.user.profile.role
        except UserProfile.DoesNotExist:
            role = None

        # Agentul NU poate șterge
        if role == UserRole.AGENT:
            return False

        # Expert, Management, Admin pot șterge
        return True


class ClientViewSet(viewsets.ModelViewSet):
    """
    CRUD pentru clienți.
    Scrierea permisă doar Management/Admin (prin IsManagementOrReadOnly).
    """

    queryset = Client.objects.all().order_by("denumire")
    serializer_class = ClientSerializer
    permission_classes = [IsManagementOrReadOnly]


class WorkerViewSet(viewsets.ModelViewSet):
    """
    CRUD pentru lucrători, cu filtrare și reguli de acces:
    - Agent -> vede doar lucrătorii unde agent = user
    - Agent -> NU poate șterge (DELETE interzis)
    - Expert/Management/Admin -> văd tot și pot șterge
    """

    serializer_class = WorkerSerializer
    permission_classes = [AgentCannotDelete]  # Aplică restricția de ștergere

    def get_queryset(self):
        user = self.request.user

        # Baza: toți lucrătorii
        qs = Worker.objects.select_related("client", "agent").all()

        if not user.is_authenticated:
            return Worker.objects.none()

        # determinăm rolul
        try:
            role = user.profile.role
        except UserProfile.DoesNotExist:
            role = None

        if role == UserRole.AGENT:
            # Agentul vede DOAR lucrătorii introduși de el
            qs = qs.filter(agent=user)
        else:
            # Expert, Management, Admin -> văd tot
            pass

        # ---- Filtre după query params ----
        params = self.request.query_params

        status_val = params.get("status")
        if status_val:
            qs = qs.filter(status=status_val)

        pasaport = params.get("pasaport_nr")
        if pasaport:
            qs = qs.filter(pasaport_nr__icontains=pasaport)

        cetatenie = params.get("cetatenie")
        if cetatenie:
            qs = qs.filter(cetatenie__iexact=cetatenie)

        client_id = params.get("client_id")
        if client_id:
            qs = qs.filter(client_id=client_id)

        # Filtru după cod COR (cod ocupațional)
        cod_cor = params.get("cod_cor")
        if cod_cor:
            qs = qs.filter(cod_cor__icontains=cod_cor)

        # Filtru după județ WP (Work Permit)
        judet_wp = params.get("judet_wp")
        if judet_wp:
            qs = qs.filter(judet_wp__iexact=judet_wp)

        # interval data_introducere
        data_start = params.get("data_start")
        data_end = params.get("data_end")

        if data_start:
            d_start = parse_date(data_start)
            if d_start:
                qs = qs.filter(data_introducere__date__gte=d_start)

        if data_end:
            d_end = parse_date(data_end)
            if d_end:
                qs = qs.filter(data_introducere__date__lte=d_end)

        return qs.order_by("-data_introducere")

