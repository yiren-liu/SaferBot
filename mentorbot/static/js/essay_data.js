/*
	global essay data
*/

/******************
	Task-specific Variables
 ******************/

class EssayManager {
	constructor(essays) {
		this.essays = essays;
		this.essay_num = essays.length;

		this.curr_essay_idx = -1;
	}
	get_curr_essay() {
		if (curr_essay_idx >= 0) {
			return this.essays[this.curr_essay_idx];
		}
	}
	get_next_essay() {
		if (this.curr_essay_idx < this.essay_num) {
			this.curr_essay_idx += 1;

			let essay = this.essays[this.curr_essay_idx];
			return essay;
		}
	}

}




// read data from 'variable_sheet.csv'
async function loadVariableSheet() {
	return d3.csv('/static/data/variable_sheet.csv').then(data => {
		data.forEach(row => {
			row.long_description = row.description;

			if (row.context in VariableSheet) {
				VariableSheet[row.context].push(row);
			}
			else {
				VariableSheet[row.context] = [row];
			}
		});

		return "success";
	})
}

var AllEssays_test = [
	{
		'author_name': "test_0",
		'create_time': "",
		'topic_id': "0",
		'text': `<span class='each'>The dumbest mistake I have made in the past and a lot in high school was turning things really late.</span><span class='each'> This leads to me working on things that the course is not working on that week and creates a domino effect of me trying to catch up.</span><span class='each'> By the time exam week comes I would be still trying to finish up things due from a week or two weeks prior.</span><span class='each'> Nowadays my procrastination has gone down quite a bit so I rarely have missing work but when I do I take in count of how important it is and the other work I have to do.</span><span class='each'> If it turns out that it is not a priority my focus shifts onto other things.</span><span class='each'> This method has proven to be less harmful in the past and till this day.</span><span class='each'> 
		
		One strategy I am partaking in this semester is designating a day or days of the week to a particular subject.</span><span class='each'> More specifically a day to learn and reflect on all the material for that week and another to do all the assignments and practice for that course.</span><span class='each'> As of right now it seems like it's going pretty well</span><span class='each'> Exam week is this week so I will see if I will still stick to this strat depending on how well I do.</span>
		`
	},
	{
		'author_name': "test_1",
		'create_time': "",
		'topic_id': "0",
		'text': "<span class='each'>The article \"11 Little Ways to Focus On Your Own Self-Improvement\" resonated with me a lot.</span><span class='each'> One major crisis going on in my life right now is understanding my identity.</span><span class='each'> After my first year in college, I didn't know who I was, what I wanted to do, and what my purpose was. </span><span class='each'>To answer these questions, I would constantly over work myself, distance from my friends, and try to work towards my best me. </span><span class='each'>The thing was, I was very impatient when I didn't see progress in any aspect of my life.</span><span class='each'> Growing up, I always found progress when I put the work in but when I saw nothing in college I felt dejected and trapped.</span><span class='each'> The first paragraph of this article talks about how \"it's important to always be learning and growing in life for happiness to last.</span><span class='each'>\" This resonated with me because for the longest time, I thought achieving something would lead to my happiness. </span><span class='each'>Now, I'm realizing that rather than focusing on the reward, I should really embrace the process in getting there. </span><span class='each'>\n In an academic, three things I do well are:\n Rather than memorizing how to do problems, I try to understand the conceptual side to each problem.</span><span class='each'> I find this beneficial because it gives me the ability to attempt all sorts of problems rather than specific ones.</span><span class='each'> \n I take time in doing my homework assignments rather than rushing them.</span><span class='each'> I feel like if I can understand everything on the homework, it will help me retain the information more clearly.</span><span class='each'> \n I do more problems than necessary in order to retain the information\n Three things I can work on are:\n I need to get better at time management.</span><span class='each'> When studying for an exam, I cram 2 days before the exam.</span><span class='each'> I feel like if I can start studying a week in advance, it would be more beneficial and less stressful.</span><span class='each'>\n I tend to skip class and watch online lectures just so I dont have to wake up early.</span><span class='each'> I feel like this is bad because it isn't setting me up for the real world after college when I get a job.</span><span class='each'> Also, I can ask questions when I actually attend lecture rather than watching the lecture afterwards.</span><span class='each'> \n I don't go to office hours to get help.</span><span class='each'> I usually search the web to get answers to questions.</span><span class='each'> I feel like going to office hours is more helpful because it gives me the opportunity to get a better and answer and more follow up questions.</span>",
	},
	{
		'author_name': "test_2",
		'create_time': "",
		'topic_id': "0",
		'text': "<span class='each'>I enjoyed Sheena Lyengar‚ she talk about how the narratives we use to explain events in our live shapes our responses to them.</span><span class='each'> What I preferred about her talk over other motivational speeches is that she acknowledged the level of nuance present in real-life situations and the reality that some things in our life really do come down to fate or chance and were never in our control at all.</span><span class='each'> Rather than presenting an oversimplified and blame-centered narrative, Sheena reminds us that while fate or chance may narrow our field of options, we can still make choices about how to respond to life‚Äôs setbacks and how to proceed.</span><span class='each'> Also, her talk falls in line with similar articles I love read proposing that choice-based language (e.g. I will versus I could, or I choose to rather than I have to) is beneficial to self-esteem because it emphasizes personal agency and the power to affect change.</span><span class='each'>\n Three things I excel at academically are problem-solving, writing, and dividing tasks into manageable pieces.</span><span class='each'> Three skills I could improve are collaboration, budgeting my time, and optimizing retention from studying.</span>",
	},
]

var Essays_tutorial = [
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'>School has started to pick up and I slept at late hours, which made me wake up later than I used to. </span><span class='each'>I feel like I don't have enough time in a day to fully comprehend the subject matter. </span><span class='each'>I think the way to go about this is to limit the amount of video games I play during the day. </span><span class='each'>For this month, I want to gain good habits that will fix my sleeping cycle, exercising consistently, and a fun goal would be that getting a high rank for a game that I play during the weekends.</span>`,
	},
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'><i>School has started to pick up and I slept at late hours, which made me wake up later than I used to.</i> </span><span class='each'><u> I feel like I don't have enough time in a day to fully comprehend the subject matter.</u></span><span class='each'><b> I think the way to go about this is to limit the amount of video games I play during the day.</b></span><span class='each'><span style="background-color:#A3A300"> For this month, I want to gain good habits that will fix my sleeping cycle, exercising consistently, and a fun goal would be that getting a high rank for a game that I play during the weekends.</span></span>`,
	},
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'><i>I always do my best to maintain a daily routine, but I never seem to have the dedication 
		to stick to one.
		
		</span><span class='each'>I am learning to be able to look in a neutral perspective to my future.
		
		</span><span class='each'>I still keep it in my calendar, but I'm never able to stick to it.</i>
		</span>`,
	},
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'>I love playing video games <u>because that is honestly the only form of 
		contact I have with my friends where we actually do something.
		
		</span><span class='each'>I found her talk very insightful, as she presented some very important 
		lessons in a very valuable</u>, not condescending way.
		</span>`,
	},
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'>I feel that <b>this will be beneficial for me because it will help get rid of the anxiety I have over trivial issues as well as boost my overall self esteem.</b></span>`,
	},
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'>One <span style="background-color:#A3A300">healthy routine I can incorporate into my life, as I said, is to start exercising.</span>
		</span><span class='each'>Another healthy routine <span style="background-color:#A3A300">I will incorporate into my life is maintaining a balanced sleep schedule.</span>
		</span>`,
	},
	{
		'author_name': "tutorial",
		'create_time': "",
		'topic_id': "0",
		'text':
			`
		<span class='each'></span><span class='each'><i>School has started to pick up and I slept at late hours, which made me wake up later than I used to.</i> 
		</span><span class='each'><u>I feel like I don't have enough time in a day to fully comprehend the subject matter.</u>
		</span><span class='each'><b>I think the way to go about this is to limit the amount of video games I play during the day.</b>
		</span><span class='each'><span style="background-color:#A3A300">For this month, I want to gain good habits that will fix my sleeping cycle, exercising consistently, 
		and a fun goal would be that getting a high rank for a game that I play during the weekends.</span>
		</span>`,
	},
]