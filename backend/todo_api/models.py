from django.db import models
from django.utils import timezone

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Task(models.Model):
    RECURRENCE_CHOICES = [
        ('NONE', 'Nenhuma'),
        ('DAILY', 'Diária'),
        ('WEEKLY', 'Semanal'),
        ('MONTHLY', 'Mensal')
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    position = models.FloatField(default=0.0)
    due_date = models.DateField(default=timezone.localdate)
    recurrence_type = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='NONE')
    tags = models.ManyToManyField(Tag, blank=True, related_name='tasks')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Subtask(models.Model):
    task = models.ForeignKey(Task, related_name='subtasks', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    position = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.title} (Task: {self.task.title})"
