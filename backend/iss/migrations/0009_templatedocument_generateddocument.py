# Generated manually for TemplateDocument and GeneratedDocument

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def template_document_path(instance, filename):
    return f'templates/{instance.template_type}/{filename}'


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('iss', '0008_add_autoritate_emitenta_and_functie'),
    ]

    operations = [
        migrations.CreateModel(
            name='TemplateDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('template_type', models.CharField(
                    choices=[
                        ('cerere_work_permit', 'Cerere Work Permit'),
                        ('oferta_angajare', 'Ofertă de Angajare'),
                        ('scrisoare_garantie', 'Scrisoare de Garanție'),
                        ('declaratie', 'Declarație'),
                        ('cim', 'Contract Individual de Muncă (CIM)')
                    ],
                    db_index=True,
                    help_text='Tipul de template',
                    max_length=30
                )),
                ('file', models.FileField(
                    help_text='Fișier Word (.docx)',
                    upload_to='templates/'
                )),
                ('original_filename', models.CharField(max_length=255)),
                ('is_active', models.BooleanField(
                    db_index=True,
                    default=True,
                    help_text='Dacă acest template este activ'
                )),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(
                    blank=True,
                    help_text='Descriere sau note despre acest template'
                )),
                ('uploaded_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='uploaded_templates',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'verbose_name': 'Template Document',
                'verbose_name_plural': 'Template-uri Documente',
                'ordering': ['template_type', '-uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='GeneratedDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('template_type', models.CharField(
                    choices=[
                        ('cerere_work_permit', 'Cerere Work Permit'),
                        ('oferta_angajare', 'Ofertă de Angajare'),
                        ('scrisoare_garantie', 'Scrisoare de Garanție'),
                        ('declaratie', 'Declarație'),
                        ('cim', 'Contract Individual de Muncă (CIM)')
                    ],
                    help_text='Tip template (păstrat și dacă template-ul este șters)',
                    max_length=30
                )),
                ('worker_name', models.CharField(
                    help_text='Nume lucrător (păstrat pentru istoric)',
                    max_length=150
                )),
                ('generated_by_username', models.CharField(max_length=150)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('output_format', models.CharField(
                    choices=[('docx', 'Word'), ('pdf', 'PDF')],
                    default='docx',
                    max_length=10
                )),
                ('generated_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='generated_docs',
                    to=settings.AUTH_USER_MODEL
                )),
                ('template', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='generated_documents',
                    to='iss.templatedocument'
                )),
                ('worker', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='generated_documents',
                    to='iss.worker'
                )),
            ],
            options={
                'verbose_name': 'Document Generat',
                'verbose_name_plural': 'Documente Generate',
                'ordering': ['-generated_at'],
            },
        ),
    ]

