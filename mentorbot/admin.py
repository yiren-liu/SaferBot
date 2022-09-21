from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
import mentorbot.models

class UserDataAdmin(admin.ModelAdmin):
	list_display = ('get_username', 'user_type', 'progress', 'condition')

	def get_username(self, obj):
		return obj.user.username
	get_username.admin_order_field = 'user'
	get_username.short_description = 'username'

class UserLogAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'timestamp', 'path', 'action', 'message_json')

class CausalDiagramAdmin(ImportExportModelAdmin, admin.ModelAdmin):
	list_display = ('id', 'username', 'context', 'label', 'timestamp')

class RegressionResultAdmin(ImportExportModelAdmin, admin.ModelAdmin):
	list_display = ('id', 'Yname', 'Xnames', 'cache_key',)

# Register your models here.
admin.site.register(mentorbot.models.UserData, UserDataAdmin)
admin.site.register(mentorbot.models.CausalDiagram, CausalDiagramAdmin)
admin.site.register(mentorbot.models.UserLog, UserLogAdmin)
admin.site.register(mentorbot.models.RegressionResult, RegressionResultAdmin)
