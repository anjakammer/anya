.PHONY : package lint helmsman-plan helmsman-apply

lint:
	helm lint anya-app/anya/

package:
	helm package --destination dist anya-app/anya/
	helm repo index dist/
	gsutil cp -r dist/* gs://anya-deployment/charts/

helmsman-plan :
	helmsman -f helmsman-config/setup.toml --dry-run --verbose

helmsman-apply :
	helmsman -f helmsman-config/setup.toml --apply
