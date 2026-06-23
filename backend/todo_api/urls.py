from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TagViewSet, TaskViewSet, SubtaskViewSet

router = DefaultRouter()
router.register(r'tags', TagViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'subtasks', SubtaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
