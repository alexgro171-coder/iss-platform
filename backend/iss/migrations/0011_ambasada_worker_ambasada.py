# Generated manually for Ambasada model and Worker.ambasada field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('iss', '0010_alter_templatedocument_file'),
    ]

    operations = [
        migrations.CreateModel(
            name='Ambasada',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('denumire', models.CharField(
                    help_text='Denumirea ambasadei (ex: Ambasada României la Kathmandu)',
                    max_length=100,
                    unique=True
                )),
                ('tara', models.CharField(
                    blank=True,
                    help_text='Țara în care se află ambasada',
                    max_length=50
                )),
                ('oras', models.CharField(
                    blank=True,
                    help_text='Orașul în care se află ambasada',
                    max_length=50
                )),
                ('activ', models.BooleanField(
                    default=True,
                    help_text='Dacă ambasada este activă și poate fi selectată'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Ambasadă',
                'verbose_name_plural': 'Ambasade',
                'ordering': ['denumire'],
            },
        ),
        migrations.AddField(
            model_name='worker',
            name='ambasada',
            field=models.ForeignKey(
                blank=True,
                help_text='Ambasada unde se depune cererea de viză',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='workers',
                to='iss.ambasada'
            ),
        ),
    ]

