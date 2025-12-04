from django.utils.dateparse import parse_date
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from io import BytesIO
import openpyxl
from openpyxl import Workbook

from .models import Client, Worker, UserProfile, UserRole, ActivityLog, LogType, LogAction
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

    @action(detail=False, methods=['get'], url_path='bulk-template')
    def bulk_template(self, request):
        """
        Descarcă template Excel pentru import bulk.
        GET /api/workers/bulk-template/
        """
        # Creăm workbook-ul Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Lucrători"

        # Header-uri (coloanele din template)
        headers = [
            'nume', 'prenume', 'pasaport_nr', 'cetatenie', 'stare_civila',
            'copii_intretinere', 'sex', 'data_nasterii', 'oras_domiciliu',
            'data_emitere_pass', 'data_exp_pass', 'dosar_wp_nr',
            'data_solicitare_wp', 'data_programare_wp', 'judet_wp', 'cod_cor',
            'data_solicitare_viza', 'data_programare_interviu', 'status',
            'cnp', 'data_intrare_ro', 'cim_nr', 'data_emitere_cim',
            'data_depunere_ps', 'data_programare_ps', 'data_emitere_ps',
            'data_expirare_ps', 'adresa_ro', 'client_denumire', 'observatii'
        ]

        # Scriem header-urile
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = openpyxl.styles.Font(bold=True)
            cell.fill = openpyxl.styles.PatternFill(start_color="366092", end_color="366092", fill_type="solid")
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")

        # Adăugăm un rând exemplu
        example_row = [
            'Popescu', 'Ion', 'AB123456', 'Nepal', 'M',
            0, 'M', '1990-01-15', 'Kathmandu',
            '2023-01-01', '2033-01-01', 'WP-001',
            '2024-01-01', '2024-02-01', 'București', '721401',
            '2024-02-15', '2024-03-01', 'Aviz solicitat',
            '', '', '', '',
            '', '', '', '',
            '', 'Client Exemplu', 'Observații exemplu'
        ]
        for col, value in enumerate(example_row, 1):
            ws.cell(row=2, column=col, value=value)

        # Ajustăm lățimea coloanelor
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 30)
            ws.column_dimensions[column].width = adjusted_width

        # Salvăm în memory buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=template_import_lucratori.xlsx'
        return response

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        Import bulk lucrători din fișier Excel.
        POST /api/workers/bulk-import/
        """
        # Verificăm permisiunile (doar Management/Admin)
        try:
            role = request.user.profile.role
        except UserProfile.DoesNotExist:
            role = None

        if role not in (UserRole.MANAGEMENT, UserRole.ADMIN):
            return Response(
                {'detail': 'Nu aveți permisiunea de a importa lucrători.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificăm dacă avem fișier
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'Te rog încarcă un fișier Excel.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES['file']

        # Verificăm extensia
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'detail': 'Fișierul trebuie să fie în format Excel (.xlsx sau .xls).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Citim fișierul Excel
            wb = openpyxl.load_workbook(file)
            ws = wb.active

            # Obținem header-urile și le normalizăm (lowercase, fără spații)
            raw_headers = [cell.value for cell in ws[1]]
            headers = []
            import re
            for h in raw_headers:
                if h:
                    # Normalizăm: lowercase, strip
                    normalized = str(h).lower().strip()
                    # Eliminăm tot ce e în paranteze (ex: "(m/nm)", "(yyyy-mm-dd)")
                    normalized = re.sub(r'\([^)]*\)', '', normalized)
                    # Eliminăm asteriscuri și alte caractere speciale
                    normalized = normalized.replace('*', '').replace('.', '').replace(',', '').replace(':', '')
                    # Înlocuim spații multiple cu unul singur, apoi cu underscore
                    normalized = re.sub(r'\s+', '_', normalized)
                    # Eliminăm underscore-uri la început și sfârșit
                    normalized = normalized.strip('_')
                    
                    # Mapări pentru variante comune (inclusiv în română cu diacritice)
                    header_map = {
                        # Pașaport - toate variantele posibile
                        'nr_pasaport': 'pasaport_nr',
                        'nr_pașaport': 'pasaport_nr',
                        'numar_pasaport': 'pasaport_nr',
                        'număr_pașaport': 'pasaport_nr',
                        'pasaport': 'pasaport_nr',
                        'pașaport': 'pasaport_nr',
                        'passport': 'pasaport_nr',
                        'passport_nr': 'pasaport_nr',
                        'passport_number': 'pasaport_nr',
                        'pașaport_nr': 'pasaport_nr',
                        # Date pașaport
                        'data_emitere_pașaport': 'data_emitere_pass',
                        'data_emitere_pasaport': 'data_emitere_pass',
                        'data_expirare_pașaport': 'data_exp_pass',
                        'data_expirare_pasaport': 'data_exp_pass',
                        # Nume/Prenume
                        'first_name': 'prenume',
                        'last_name': 'nume',
                        'family_name': 'nume',
                        'given_name': 'prenume',
                        'name': 'nume',
                        'surname': 'nume',
                        'forename': 'prenume',
                        # Cetățenie
                        'nationality': 'cetatenie',
                        'citizenship': 'cetatenie',
                        'cetățenie': 'cetatenie',
                        'cetăţenie': 'cetatenie',
                        # Date naștere
                        'birth_date': 'data_nasterii',
                        'date_of_birth': 'data_nasterii',
                        'data_nașterii': 'data_nasterii',
                        'data_nastere': 'data_nasterii',
                        # Stare civilă
                        'stare_civilă': 'stare_civila',
                        'stare_civila': 'stare_civila',
                        # Altele cu diacritice
                        'oraș_domiciliu': 'oras_domiciliu',
                        'oras_domiciliu': 'oras_domiciliu',
                        'copii_întreținere': 'copii_intretinere',
                        'copii_intretinere': 'copii_intretinere',
                        'județ_wp': 'judet_wp',
                        'judet_wp': 'judet_wp',
                        'observații': 'observatii',
                        'observatii': 'observatii',
                        # Work Permit
                        'data_solicitare_aviz': 'data_solicitare_wp',
                        'data_programare_igi': 'data_programare_wp',
                        # Permis ședere
                        'data_depunere_permis_ședere': 'data_depunere_ps',
                        'data_programare_permis_ședere': 'data_programare_ps',
                        'data_emitere_permis_ședere': 'data_emitere_ps',
                        'data_expirare_permis_ședere': 'data_expirare_ps',
                        # Client
                        'client': 'client_denumire',
                        'denumire_client': 'client_denumire',
                    }
                    headers.append(header_map.get(normalized, normalized))
                else:
                    headers.append(None)
            
            # Debug: returnăm headers detectate dacă nu avem datele corecte
            detected_headers = [h for h in headers if h]
            
            results = {
                'total': 0,
                'success': 0,
                'errors': 0,
                'details': []
            }

            # Procesăm fiecare rând (începând de la 2 pentru a sări header-ul)
            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                # Skip rânduri complet goale
                if not any(row):
                    continue
                    
                results['total'] += 1
                
                # Creăm dict cu datele
                row_data = {}
                for col_idx, value in enumerate(row):
                    if col_idx < len(headers) and headers[col_idx] and value is not None:
                        # Convertim valoarea la string dacă e necesar și curățăm
                        row_data[headers[col_idx]] = value

                # Verificăm câmpurile obligatorii
                nume = row_data.get('nume')
                prenume = row_data.get('prenume')
                pasaport = row_data.get('pasaport_nr')
                
                # Skip rânduri fără date obligatorii
                if not nume or not pasaport:
                    # Dacă are alte date dar lipsesc câmpuri obligatorii
                    if any(v for v in row_data.values() if v):
                        results['errors'] += 1
                        missing = []
                        if not nume:
                            missing.append('nume')
                        if not prenume:
                            missing.append('prenume')
                        if not pasaport:
                            missing.append('pasaport_nr')
                        
                        # La primul rând cu eroare, adăugăm info despre headers detectate
                        error_msg = f'Lipsesc câmpuri obligatorii: {", ".join(missing)}'
                        if row_idx == 2 and detected_headers:
                            error_msg += f' (Coloane detectate: {", ".join(detected_headers[:10])}...)'
                        
                        results['details'].append({
                            'row': row_idx,
                            'status': 'error',
                            'message': error_msg
                        })
                    continue

                try:
                    # Verificăm dacă pașaportul există deja
                    pasaport_nr = str(row_data.get('pasaport_nr', '')).strip()
                    if Worker.objects.filter(pasaport_nr=pasaport_nr).exists():
                        results['errors'] += 1
                        results['details'].append({
                            'row': row_idx,
                            'status': 'error',
                            'message': f'Pașaportul {pasaport_nr} există deja în baza de date'
                        })
                        continue

                    # Găsim clientul dacă e specificat
                    client = None
                    client_denumire = row_data.get('client_denumire')
                    if client_denumire:
                        client = Client.objects.filter(denumire__iexact=str(client_denumire).strip()).first()

                    # Procesăm datele
                    def parse_date_value(value):
                        if not value:
                            return None
                        if isinstance(value, str):
                            return parse_date(value)
                        # Dacă e datetime din Excel
                        try:
                            return value.date() if hasattr(value, 'date') else value
                        except:
                            return None

                    def parse_int_value(value):
                        try:
                            return int(value) if value else 0
                        except:
                            return 0

                    # Helper pentru a obține string safe (evită "None")
                    def get_str(key, default=''):
                        val = row_data.get(key)
                        if val is None:
                            return default
                        return str(val).strip()
                    
                    # Creăm lucrătorul
                    worker = Worker.objects.create(
                        nume=get_str('nume'),
                        prenume=get_str('prenume'),
                        pasaport_nr=pasaport_nr,
                        cetatenie=get_str('cetatenie'),
                        stare_civila=get_str('stare_civila')[:2] if get_str('stare_civila') else '',
                        copii_intretinere=parse_int_value(row_data.get('copii_intretinere')),
                        sex=get_str('sex')[:1].upper() if get_str('sex') else '',
                        data_nasterii=parse_date_value(row_data.get('data_nasterii')),
                        oras_domiciliu=get_str('oras_domiciliu'),
                        data_emitere_pass=parse_date_value(row_data.get('data_emitere_pass')),
                        data_exp_pass=parse_date_value(row_data.get('data_exp_pass')),
                        dosar_wp_nr=get_str('dosar_wp_nr'),
                        data_solicitare_wp=parse_date_value(row_data.get('data_solicitare_wp')),
                        data_programare_wp=parse_date_value(row_data.get('data_programare_wp')),
                        judet_wp=get_str('judet_wp'),
                        cod_cor=get_str('cod_cor'),
                        data_solicitare_viza=parse_date_value(row_data.get('data_solicitare_viza')),
                        data_programare_interviu=parse_date_value(row_data.get('data_programare_interviu')),
                        status=get_str('status') or 'Aviz solicitat',
                        cnp=get_str('cnp'),
                        data_intrare_ro=parse_date_value(row_data.get('data_intrare_ro')),
                        cim_nr=get_str('cim_nr'),
                        data_emitere_cim=parse_date_value(row_data.get('data_emitere_cim')),
                        data_depunere_ps=parse_date_value(row_data.get('data_depunere_ps')),
                        data_programare_ps=parse_date_value(row_data.get('data_programare_ps')),
                        data_emitere_ps=parse_date_value(row_data.get('data_emitere_ps')),
                        data_expirare_ps=parse_date_value(row_data.get('data_expirare_ps')),
                        adresa_ro=get_str('adresa_ro'),
                        client=client,
                        agent=request.user,  # Agentul care importă
                        observatii=get_str('observatii'),
                    )

                    results['success'] += 1
                    results['details'].append({
                        'row': row_idx,
                        'status': 'success',
                        'message': f'{worker.nume} {worker.prenume} importat cu succes'
                    })

                except Exception as e:
                    results['errors'] += 1
                    results['details'].append({
                        'row': row_idx,
                        'status': 'error',
                        'message': str(e)
                    })

            # Logăm importul
            ActivityLog.log(
                log_type=LogType.ACTIVITY,
                action=LogAction.BULK_IMPORT,
                user=request.user,
                details={
                    'message': f'Import bulk: {results["success"]} succes, {results["errors"]} erori',
                    'total': results['total'],
                    'success': results['success'],
                    'errors': results['errors'],
                    'filename': file.name,
                },
                request=request
            )

            return Response(results)

        except Exception as e:
            return Response(
                {'detail': f'Eroare la procesarea fișierului: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

