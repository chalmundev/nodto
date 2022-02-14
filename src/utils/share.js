import copy from 'copy-to-clipboard';

const HELPER_URL = 'https://nearapi.secondx.app/';
const SHARE_URL = HELPER_URL + 'v1/share/';

const defaultTitle = 'Get on the List!'
const defaultDescription = 'OnTheList.app - Access lists on NEAR Protocol!'

export const share = async ({
	image,
	link,
	title = defaultTitle,
	description = defaultDescription,
}) => {

	const url = await getShareUrl({
		image,
		link,
		title,
		description
	})

	if (window.navigator.share) {
		await window.navigator.share({
			title,
			text: description,
			url,
		});
	} else {
		console.log(url)
		copy(url)
		alert('Link Copied!')
	}
}

const getShareUrl = async ({
	image,
	link,
	title = defaultTitle,
	description = defaultDescription,
}) => {
	return (await fetch(SHARE_URL + JSON.stringify({
		title: encodeURIComponent(title),
		description: encodeURIComponent(description),
		image: encodeURIComponent(image),
		redirect: encodeURIComponent(window.origin + link)
	})).then((res) => res.json())).encodedUrl;
};