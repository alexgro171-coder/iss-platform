# Generated manually for adding autoritate_emitenta_pasaport and functie fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iss', '0002_add_telefon_to_userprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='worker',
            name='autoritate_emitenta_pasaport',
            field=models.CharField(
                blank=True,
                help_text='Autoritatea care a emis pașaportul (obligatoriu la recrutare)',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='worker',
            name='functie',
            field=models.CharField(
                blank=True,
                help_text='Funcția/ocupația după semnarea CIM (completabil doar după sosire)',
                max_length=255,
            ),
        ),
    ]

