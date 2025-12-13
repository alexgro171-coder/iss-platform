"""
Eco-Fin Views
API endpoints pentru modulul de profitabilitate.
"""
from datetime import datetime
from decimal import Decimal
from django.db.models import Sum, Avg, Count, F
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
import openpyxl

from iss.models import Worker, Client, UserProfile, UserRole
from .models import EcoFinSettings, EcoFinMonthlyReport, EcoFinImportBatch
from .serializers import (
    EcoFinSettingsSerializer,
    EcoFinMonthlyReportSerializer,
    EcoFinImportBatchSerializer,
    EcoFinPreviewRowSerializer,
    EcoFinReportSummarySerializer,
)


class IsManagementOrAdmin(permissions.BasePermission):
    """Permite acces doar pentru Management și Admin."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            role = request.user.profile.role
        except UserProfile.DoesNotExist:
            return False
        return role in [UserRole.MANAGEMENT, UserRole.ADMIN]


class EcoFinSettingsViewSet(viewsets.ModelViewSet):
    """
    CRUD pentru setările globale Eco-Fin.
    Doar Management/Admin.
    """
    queryset = EcoFinSettings.objects.all()
    serializer_class = EcoFinSettingsSerializer
    permission_classes = [IsManagementOrAdmin]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='current/(?P<year>[0-9]+)/(?P<month>[0-9]+)')
    def get_for_month(self, request, year=None, month=None):
        """Obține setările pentru o lună specifică."""
        try:
            settings = EcoFinSettings.objects.get(year=int(year), month=int(month))
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        except EcoFinSettings.DoesNotExist:
            return Response({'detail': 'Setări negăsite pentru această lună.'}, status=404)


class EcoFinMonthlyReportViewSet(viewsets.ModelViewSet):
    """
    CRUD pentru rapoartele lunare Eco-Fin.
    Doar Management/Admin pot crea/modifica.
    """
    queryset = EcoFinMonthlyReport.objects.select_related('worker', 'client').all()
    serializer_class = EcoFinMonthlyReportSerializer
    permission_classes = [IsManagementOrAdmin]

    def get_queryset(self):
        """Filtrare după year, month, client_id, worker_id."""
        qs = super().get_queryset()
        params = self.request.query_params
        
        year = params.get('year')
        if year:
            qs = qs.filter(year=int(year))
        
        month = params.get('month')
        if month:
            qs = qs.filter(month=int(month))
        
        client_id = params.get('client_id')
        if client_id:
            qs = qs.filter(client_id=int(client_id))
        
        worker_id = params.get('worker_id')
        if worker_id:
            qs = qs.filter(worker_id=int(worker_id))
        
        is_validated = params.get('is_validated')
        if is_validated is not None:
            qs = qs.filter(is_validated=is_validated.lower() == 'true')
        
        return qs.order_by('worker__nume', 'client__denumire')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """Verifică dacă raportul e validat - doar Admin poate modifica."""
        instance = self.get_object()
        if instance.is_validated:
            if not request.user.is_superuser:
                return Response(
                    {'detail': 'Raportul este validat. Doar Admin poate modifica.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Verifică dacă raportul e validat - doar Admin poate șterge."""
        instance = self.get_object()
        if instance.is_validated:
            if not request.user.is_superuser:
                return Response(
                    {'detail': 'Raportul este validat. Doar Admin poate șterge.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Returnează sumar pentru filtrele specificate.
        GET /api/eco-fin/reports/summary/?year=2024&month=12&client_id=1
        """
        qs = self.get_queryset()
        
        if not qs.exists():
            return Response({
                'total_workers': 0,
                'total_hours': 0,
                'total_salary_cost': 0,
                'total_revenue': 0,
                'total_costs': 0,
                'total_profit': 0,
                'average_profit_per_worker': 0,
                'by_client': []
            })
        
        # Calcule agregate
        totals = qs.aggregate(
            total_workers=Count('id'),
            total_hours=Sum('hours_worked'),
            total_salary_cost=Sum('salary_cost'),
            total_profit=Sum('profit_brut'),
        )
        
        # Calculăm veniturile și costurile totale
        total_revenue = sum(
            r.hours_worked * r.tarif_orar for r in qs
        )
        total_costs = sum(
            r.salary_cost + r.cost_cazare + r.cost_masa + 
            r.cost_transport + r.cost_concediu + r.cheltuieli_indirecte
            for r in qs
        )
        
        # Per client
        by_client = list(
            qs.values('client__id', 'client__denumire')
            .annotate(
                workers_count=Count('id'),
                total_hours=Sum('hours_worked'),
                total_profit=Sum('profit_brut')
            )
            .order_by('-total_profit')
        )
        
        avg_profit = totals['total_profit'] / totals['total_workers'] if totals['total_workers'] else 0
        
        return Response({
            'total_workers': totals['total_workers'] or 0,
            'total_hours': float(totals['total_hours'] or 0),
            'total_salary_cost': float(totals['total_salary_cost'] or 0),
            'total_revenue': float(total_revenue),
            'total_costs': float(total_costs),
            'total_profit': float(totals['total_profit'] or 0),
            'average_profit_per_worker': float(avg_profit),
            'by_client': by_client
        })


class EcoFinImportViewSet(viewsets.ViewSet):
    """
    ViewSet pentru import Excel și validare.
    """
    permission_classes = [IsManagementOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """
        POST /api/eco-fin/import/upload/
        Upload fișier Excel și generare preview.
        """
        file = request.FILES.get('file')
        year = request.data.get('year')
        month = request.data.get('month')
        
        if not file:
            return Response({'detail': 'Fișierul este obligatoriu.'}, status=400)
        if not year or not month:
            return Response({'detail': 'Year și month sunt obligatorii.'}, status=400)
        
        year = int(year)
        month = int(month)
        
        # Verifică dacă luna e deja validată
        existing_validated = EcoFinMonthlyReport.objects.filter(
            year=year, month=month, is_validated=True
        ).exists()
        
        if existing_validated:
            return Response({
                'detail': f'Luna {month:02d}/{year} este deja validată. Contactați Admin pentru modificări.'
            }, status=400)
        
        # Obține setările pentru lună
        try:
            settings = EcoFinSettings.objects.get(year=year, month=month)
        except EcoFinSettings.DoesNotExist:
            return Response({
                'detail': f'Setările pentru luna {month:02d}/{year} nu sunt configurate. Configurați mai întâi cheltuielile indirecte și costul concediu.'
            }, status=400)
        
        try:
            # Parsează Excel
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
            
            # Găsește header-urile
            headers = {}
            for col_idx, cell in enumerate(ws[1], 1):
                if cell.value:
                    header_lower = str(cell.value).lower().strip()
                    headers[header_lower] = col_idx
            
            # Mapare coloane
            passport_col = headers.get('passport') or headers.get('pasaport') or headers.get('worker passport number')
            hours_col = headers.get('hours') or headers.get('ore') or headers.get('total hours worked')
            salary_col = headers.get('salary') or headers.get('salariu') or headers.get('total salary cost')
            
            if not passport_col:
                return Response({'detail': 'Coloana Passport nu a fost găsită în Excel.'}, status=400)
            if not hours_col:
                return Response({'detail': 'Coloana Hours/Ore nu a fost găsită în Excel.'}, status=400)
            if not salary_col:
                return Response({'detail': 'Coloana Salary/Salariu nu a fost găsită în Excel.'}, status=400)
            
            # Calculăm cheltuielile indirecte per lucrător
            # (se va recalcula după ce știm câți lucrători sunt)
            preview_rows = []
            valid_rows = 0
            
            for row_idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
                passport_val = row[passport_col - 1].value
                if not passport_val:
                    continue
                
                passport_nr = str(passport_val).strip()
                hours_val = row[hours_col - 1].value or 0
                salary_val = row[salary_col - 1].value or 0
                
                try:
                    hours_worked = Decimal(str(hours_val))
                    salary_cost = Decimal(str(salary_val))
                except:
                    hours_worked = Decimal('0')
                    salary_cost = Decimal('0')
                
                # Caută lucrătorul
                worker = Worker.objects.filter(pasaport_nr__iexact=passport_nr).first()
                
                errors = []
                worker_found = worker is not None
                client_found = False
                client = None
                
                if not worker_found:
                    errors.append(f'Lucrător cu pașaport {passport_nr} nu a fost găsit.')
                else:
                    client = worker.client
                    client_found = client is not None
                    if not client_found:
                        errors.append('Lucrătorul nu are client asignat.')
                
                # Date din client
                tarif_orar = client.tarif_orar if client else Decimal('0')
                cost_cazare = client.cazare_cost if client else Decimal('0')
                cost_masa = client.masa_cost if client else Decimal('0')
                cost_transport = client.transport_cost if client else Decimal('0')
                
                valid_rows += 1 if (worker_found and client_found) else 0
                
                preview_rows.append({
                    'row_number': row_idx,
                    'pasaport_nr': passport_nr,
                    'hours_worked': float(hours_worked),
                    'salary_cost': float(salary_cost),
                    'worker_found': worker_found,
                    'worker_id': worker.id if worker else None,
                    'worker_nume': worker.nume if worker else None,
                    'worker_prenume': worker.prenume if worker else None,
                    'worker_cetatenie': worker.cetatenie if worker else None,
                    'worker_cnp': worker.cnp if worker else None,
                    'client_found': client_found,
                    'client_id': client.id if client else None,
                    'client_denumire': client.denumire if client else None,
                    'tarif_orar': float(tarif_orar),
                    'cost_cazare': float(cost_cazare),
                    'cost_masa': float(cost_masa),
                    'cost_transport': float(cost_transport),
                    'cost_concediu': float(settings.cost_concediu),
                    'cheltuieli_indirecte': 0,  # Se calculează după
                    'profit_brut_estimat': 0,  # Se calculează după
                    'is_valid': worker_found and client_found,
                    'errors': errors
                })
            
            # Calculăm cheltuielile indirecte per lucrător valid
            if valid_rows > 0:
                cheltuieli_per_worker = float(settings.cheltuieli_indirecte) / valid_rows
            else:
                cheltuieli_per_worker = 0
            
            # Actualizăm calculele
            for row in preview_rows:
                if row['is_valid']:
                    row['cheltuieli_indirecte'] = round(cheltuieli_per_worker, 2)
                    venit = Decimal(str(row['hours_worked'])) * Decimal(str(row['tarif_orar']))
                    costuri = (
                        Decimal(str(row['salary_cost'])) +
                        Decimal(str(row['cost_cazare'])) +
                        Decimal(str(row['cost_masa'])) +
                        Decimal(str(row['cost_transport'])) +
                        Decimal(str(row['cost_concediu'])) +
                        Decimal(str(row['cheltuieli_indirecte']))
                    )
                    row['profit_brut_estimat'] = float(venit - costuri)
            
            # Creăm batch-ul de import
            batch = EcoFinImportBatch.objects.create(
                year=year,
                month=month,
                filename=file.name,
                total_rows=len(preview_rows),
                successful_rows=valid_rows,
                failed_rows=len(preview_rows) - valid_rows,
                status='preview',
                imported_by=request.user
            )
            
            return Response({
                'batch_id': batch.id,
                'year': year,
                'month': month,
                'total_rows': len(preview_rows),
                'valid_rows': valid_rows,
                'invalid_rows': len(preview_rows) - valid_rows,
                'settings': {
                    'cheltuieli_indirecte': float(settings.cheltuieli_indirecte),
                    'cost_concediu': float(settings.cost_concediu),
                    'cheltuieli_per_worker': cheltuieli_per_worker
                },
                'preview': preview_rows
            })
            
        except Exception as e:
            return Response({'detail': f'Eroare la procesarea fișierului: {str(e)}'}, status=400)

    @action(detail=False, methods=['post'], url_path='validate')
    def validate_import(self, request):
        """
        POST /api/eco-fin/import/validate/
        Validează și salvează datele din preview.
        """
        year = request.data.get('year')
        month = request.data.get('month')
        rows = request.data.get('rows', [])  # Lista de rânduri de salvat
        
        if not year or not month:
            return Response({'detail': 'Year și month sunt obligatorii.'}, status=400)
        
        year = int(year)
        month = int(month)
        
        # Verifică setările
        try:
            settings = EcoFinSettings.objects.get(year=year, month=month)
        except EcoFinSettings.DoesNotExist:
            return Response({'detail': 'Setările pentru această lună nu există.'}, status=400)
        
        # Șterge rapoartele existente nevalidate pentru această lună
        EcoFinMonthlyReport.objects.filter(
            year=year, month=month, is_validated=False
        ).delete()
        
        # Calculăm cheltuielile indirecte per lucrător
        valid_count = len([r for r in rows if r.get('is_valid')])
        cheltuieli_per_worker = float(settings.cheltuieli_indirecte) / valid_count if valid_count > 0 else 0
        
        created_reports = []
        errors = []
        
        for row in rows:
            if not row.get('is_valid'):
                continue
            
            try:
                worker = Worker.objects.get(id=row['worker_id'])
                client = Client.objects.get(id=row['client_id'])
                
                report = EcoFinMonthlyReport.objects.create(
                    worker=worker,
                    client=client,
                    year=year,
                    month=month,
                    hours_worked=Decimal(str(row['hours_worked'])),
                    salary_cost=Decimal(str(row['salary_cost'])),
                    tarif_orar=client.tarif_orar,
                    cost_cazare=client.cazare_cost,
                    cost_masa=client.masa_cost,
                    cost_transport=client.transport_cost,
                    cost_concediu=settings.cost_concediu,
                    cheltuieli_indirecte=Decimal(str(cheltuieli_per_worker)),
                    is_validated=True,
                    validated_at=timezone.now(),
                    validated_by=request.user,
                    created_by=request.user,
                    notes=row.get('notes', '')
                )
                created_reports.append(report.id)
            except Exception as e:
                errors.append({
                    'row': row.get('row_number'),
                    'error': str(e)
                })
        
        # Actualizează batch-ul
        EcoFinImportBatch.objects.filter(
            year=year, month=month, status='preview'
        ).update(status='validated')
        
        return Response({
            'success': True,
            'created_reports': len(created_reports),
            'errors': errors,
            'message': f'Au fost create și validate {len(created_reports)} rapoarte pentru {month:02d}/{year}.'
        })

    @action(detail=False, methods=['get'], url_path='batches')
    def list_batches(self, request):
        """Lista de batch-uri de import."""
        batches = EcoFinImportBatch.objects.all()[:20]
        serializer = EcoFinImportBatchSerializer(batches, many=True)
        return Response(serializer.data)

