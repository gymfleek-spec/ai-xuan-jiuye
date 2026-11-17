from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    data = models.JSONField()
    revision = models.PositiveIntegerField(default=1)
    consent_version = models.CharField(max_length=32)
    consented_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)
