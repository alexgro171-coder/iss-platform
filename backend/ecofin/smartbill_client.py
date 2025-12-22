"""
SmartBill API Client
Documentație API: https://api.smartbill.ro/

Acest modul gestionează comunicarea cu SmartBill pentru:
- Emitere facturi
- Preluare PDF facturi
- Sincronizare status încasări
"""
import os
import base64
import requests
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, List, Any
from django.conf import settings


class SmartBillError(Exception):
    """Excepție pentru erori SmartBill API."""
    def __init__(self, message: str, status_code: int = None, response_data: dict = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(self.message)


class SmartBillClient:
    """
    Client pentru SmartBill Cloud API.
    
    Configurare prin variabile de mediu:
    - SMARTBILL_USERNAME: Email utilizator SmartBill
    - SMARTBILL_TOKEN: Token API SmartBill
    - SMARTBILL_COMPANY_CIF: CIF-ul companiei
    - SMARTBILL_SERIES: Seria pentru facturi
    - SMARTBILL_VAT_RATE_DEFAULT: Cota TVA implicită (default 21)
    """
    
    BASE_URL = "https://ws.smartbill.ro/SBORO/api"
    
    def __init__(self):
        self.username = os.environ.get('SMARTBILL_USERNAME', '')
        self.token = os.environ.get('SMARTBILL_TOKEN', '')
        self.company_cif = os.environ.get('SMARTBILL_COMPANY_CIF', '')
        self.series = os.environ.get('SMARTBILL_SERIES', '')
        self.default_vat_rate = Decimal(os.environ.get('SMARTBILL_VAT_RATE_DEFAULT', '21'))
        
        if not all([self.username, self.token, self.company_cif]):
            raise SmartBillError(
                "SmartBill credentials incomplete. Required: SMARTBILL_USERNAME, "
                "SMARTBILL_TOKEN, SMARTBILL_COMPANY_CIF"
            )
    
    def _get_auth_header(self) -> str:
        """Generează header-ul de autorizare Basic Auth."""
        credentials = f"{self.username}:{self.token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: dict = None,
        params: dict = None
    ) -> dict:
        """
        Execută o cerere către SmartBill API.
        """
        url = f"{self.BASE_URL}/{endpoint}"
        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30
            )
            
            # Verifică răspunsul
            if response.status_code >= 400:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    pass
                raise SmartBillError(
                    f"SmartBill API error: {response.status_code}",
                    status_code=response.status_code,
                    response_data=error_data
                )
            
            return response.json() if response.content else {}
            
        except requests.RequestException as e:
            raise SmartBillError(f"Network error: {str(e)}")
    
    def _make_request_binary(self, endpoint: str, params: dict = None) -> bytes:
        """
        Execută o cerere pentru descărcare fișier binar (PDF).
        """
        url = f"{self.BASE_URL}/{endpoint}"
        headers = {
            "Authorization": self._get_auth_header(),
            "Accept": "application/octet-stream"
        }
        
        try:
            response = requests.get(
                url=url,
                headers=headers,
                params=params,
                timeout=60
            )
            
            if response.status_code >= 400:
                raise SmartBillError(
                    f"SmartBill API error downloading file: {response.status_code}",
                    status_code=response.status_code
                )
            
            return response.content
            
        except requests.RequestException as e:
            raise SmartBillError(f"Network error downloading file: {str(e)}")
    
    def issue_invoice(
        self,
        client_data: dict,
        lines: List[dict],
        issue_date: datetime = None,
        series: str = None,
        currency: str = "RON",
        due_days: int = 30
    ) -> dict:
        """
        Emite o factură în SmartBill.
        
        Args:
            client_data: Dict cu datele clientului:
                - name: Denumire client
                - cif: CIF client
                - address: Adresă
                - city: Oraș
                - county: Județ
                - country: Țară (default România)
                - email: Email (optional)
            lines: Lista de linii factură, fiecare cu:
                - name: Denumire serviciu
                - quantity: Cantitate
                - price: Preț unitar fără TVA
                - vatPercent: Cota TVA (default 21)
                - um: Unitate măsură (default "buc")
            issue_date: Data emiterii (default azi)
            series: Seria facturii (default din config)
            currency: Moneda (default RON)
            due_days: Zile scadență (default 30)
        
        Returns:
            Dict cu răspunsul SmartBill incluzând:
                - series, number: Seria și numărul facturii
                - url: URL pentru vizualizare (opțional)
        """
        if issue_date is None:
            issue_date = datetime.now()
        
        if series is None:
            series = self.series
        
        # Construiește payload-ul conform documentației SmartBill
        payload = {
            "companyVatCode": self.company_cif,
            "client": {
                "name": client_data.get('name', ''),
                "vatCode": client_data.get('cif', ''),
                "address": client_data.get('address', ''),
                "city": client_data.get('city', ''),
                "county": client_data.get('county', ''),
                "country": client_data.get('country', 'România'),
                "email": client_data.get('email', ''),
                "isTaxPayer": client_data.get('is_tax_payer', True),
                "saveToDb": True  # Salvează clientul în SmartBill
            },
            "issueDate": issue_date.strftime("%Y-%m-%d"),
            "seriesName": series,
            "currency": currency,
            "dueDate": (issue_date.replace(day=1) if due_days else issue_date).strftime("%Y-%m-%d"),
            "products": [],
            "isDraft": False,
            "useStock": False
        }
        
        # Adaugă liniile
        for line in lines:
            product = {
                "name": line.get('name', ''),
                "code": line.get('code', ''),
                "quantity": float(line.get('quantity', 1)),
                "price": float(line.get('price', 0)),
                "vatPercent": float(line.get('vatPercent', self.default_vat_rate)),
                "measureUnit": line.get('um', 'buc'),
                "isService": True,
                "saveToDb": False
            }
            payload["products"].append(product)
        
        # Emite factura
        result = self._make_request("POST", "invoice", data=payload)
        
        return {
            "success": True,
            "series": result.get("series", series),
            "number": result.get("number", ""),
            "message": result.get("message", ""),
            "url": result.get("url", "")
        }
    
    def get_invoice_pdf(self, series: str, number: str) -> bytes:
        """
        Descarcă PDF-ul unei facturi.
        
        Args:
            series: Seria facturii
            number: Numărul facturii
        
        Returns:
            Conținutul PDF ca bytes
        """
        params = {
            "cif": self.company_cif,
            "seriesname": series,
            "number": number
        }
        
        return self._make_request_binary("invoice/pdf", params=params)
    
    def get_invoice_status(self, series: str, number: str) -> dict:
        """
        Obține statusul unei facturi (inclusiv plăți).
        
        Args:
            series: Seria facturii
            number: Numărul facturii
        
        Returns:
            Dict cu informații despre factură și plăți
        """
        params = {
            "cif": self.company_cif,
            "seriesname": series,
            "number": number
        }
        
        return self._make_request("GET", "invoice/paymentstatus", params=params)
    
    def get_payments(
        self, 
        from_date: datetime, 
        to_date: datetime = None
    ) -> List[dict]:
        """
        Obține lista de încasări într-un interval.
        
        Args:
            from_date: Data de început
            to_date: Data de final (default azi)
        
        Returns:
            Lista de încasări
        """
        if to_date is None:
            to_date = datetime.now()
        
        params = {
            "cif": self.company_cif,
            "startDate": from_date.strftime("%Y-%m-%d"),
            "endDate": to_date.strftime("%Y-%m-%d")
        }
        
        result = self._make_request("GET", "payment/list", params=params)
        return result.get("payments", [])
    
    def cancel_invoice(self, series: str, number: str) -> dict:
        """
        Anulează o factură.
        
        Args:
            series: Seria facturii
            number: Numărul facturii
        
        Returns:
            Dict cu rezultatul operației
        """
        payload = {
            "companyVatCode": self.company_cif,
            "seriesName": series,
            "number": number
        }
        
        return self._make_request("DELETE", "invoice", data=payload)
    
    def test_connection(self) -> dict:
        """
        Testează conexiunea la SmartBill API.
        
        Returns:
            Dict cu informații despre conexiune
        """
        try:
            # Încearcă să obțină seriile disponibile
            params = {"cif": self.company_cif}
            result = self._make_request("GET", "invoice/series", params=params)
            
            return {
                "success": True,
                "company_cif": self.company_cif,
                "series_available": result.get("list", []),
                "message": "Conexiune reușită la SmartBill"
            }
        except SmartBillError as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Conexiune eșuată la SmartBill"
            }


def get_smartbill_client() -> Optional[SmartBillClient]:
    """
    Factory function pentru obținerea clientului SmartBill.
    Returnează None dacă credentials nu sunt configurate.
    """
    try:
        return SmartBillClient()
    except SmartBillError:
        return None


def is_smartbill_configured() -> bool:
    """
    Verifică dacă SmartBill este configurat.
    """
    return all([
        os.environ.get('SMARTBILL_USERNAME'),
        os.environ.get('SMARTBILL_TOKEN'),
        os.environ.get('SMARTBILL_COMPANY_CIF')
    ])

