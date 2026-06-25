from django.db import models
from django.utils import timezone

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class TaskList(models.Model):
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Task(models.Model):
    RECURRENCE_CHOICES = [
        ('NONE', 'Nenhuma'),
        ('DAILY', 'Diária'),
        ('WEEKLY', 'Semanal'),
        ('MONTHLY', 'Mensal'),
        ('YEARLY', 'Anual'),
        ('CUSTOM', 'Personalizada')
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Relationships
    task_list = models.ForeignKey(TaskList, related_name='tasks', on_delete=models.CASCADE, null=True, blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='tasks')
    
    # Basic attributes
    is_completed = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    position = models.FloatField(default=0.0)
    
    # Advanced scheduling and recurrence
    start_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(default=timezone.localdate)
    scheduled_time = models.TimeField(null=True, blank=True)
    
    recurrence_type = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='NONE')
    
    # Custom recurrence days
    repeat_monday = models.BooleanField(default=False)
    repeat_tuesday = models.BooleanField(default=False)
    repeat_wednesday = models.BooleanField(default=False)
    repeat_thursday = models.BooleanField(default=False)
    repeat_friday = models.BooleanField(default=False)
    repeat_saturday = models.BooleanField(default=False)
    repeat_sunday = models.BooleanField(default=False)
    
    # Visibility and notifications (stored in minutes)
    notification_offset = models.IntegerField(null=True, blank=True)
    hide_until_due = models.IntegerField(null=True, blank=True)
    
    last_occurrence = models.DateTimeField(null=True, blank=True)
    next_occurrence = models.DateTimeField(null=True, blank=True)
    
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
    
    class Meta:
        # Ensure subtasks are returned ordered by position by default
        ordering = ['position']
