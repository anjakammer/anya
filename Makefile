.PHONY : package lint helmsman-plan helmsman-apply purge-worker purge-preview update-pipeline

lint:
	helm lint charts/anya/

package:
	helm package --destination dist charts/anya/
	helm package --destination dist charts/deployment-template/
	helm repo index dist/
	gsutil cp -r dist/* gs://anya-deployment/charts/

helmsman-plan :
	helmsman -f helmsman-config/setup.toml --verbose

helmsman-apply :
	helmsman -f helmsman-config/setup.toml --apply

purge-worker :
	kubectl delete pod -n anya -l 'component in (job, build)'

purge-preview :
	kubectl delete deployment,services,ingress -n preview --all

update-pipeline :
	kubectl delete cm anya-brigade-pipeline -n anya
	kubectl create cm anya-brigade-pipeline --from-file=charts/anya/files/brigade.js -n anya
